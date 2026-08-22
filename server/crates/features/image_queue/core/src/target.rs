use std::collections::HashMap;

use entity::enums::{ArtistImageType, ReleaseImageType};
use entity::{artist, artist_image_queue, release, release_image_queue};
use infra_db::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait,
};

pub enum ImageQueueTarget {
    Artist {
        artist_id: i32,
        name: String,
        image_type: ArtistImageType,
    },
    Release {
        release_id: i32,
        title: String,
        image_type: ReleaseImageType,
    },
}

pub async fn load_targets(
    conn: &impl ConnectionTrait,
    ids: impl Iterator<Item = i32> + Clone,
) -> Result<HashMap<i32, ImageQueueTarget>, DatabaseError> {
    let mut ids = ids.peekable();
    if ids.peek().is_none() {
        return Ok(HashMap::new());
    }

    let artist_targets = artist_image_queue::Entity::find()
        .select_only()
        .column(artist_image_queue::Column::QueueId)
        .column(artist_image_queue::Column::ArtistId)
        .column(artist::Column::Name)
        .column(artist_image_queue::Column::Type)
        .join(
            JoinType::LeftJoin,
            artist_image_queue::Relation::Artist.def(),
        )
        .filter(artist_image_queue::Column::QueueId.is_in(ids.clone()))
        .into_tuple::<(i32, i32, Option<String>, ArtistImageType)>()
        .all(conn)
        .await
        .db_operation("load artist image queue targets")?;
    let release_targets = release_image_queue::Entity::find()
        .select_only()
        .column(release_image_queue::Column::QueueId)
        .column(release_image_queue::Column::ReleaseId)
        .column(release::Column::Title)
        .column(release_image_queue::Column::Type)
        .join(
            JoinType::LeftJoin,
            release_image_queue::Relation::Release.def(),
        )
        .filter(release_image_queue::Column::QueueId.is_in(ids))
        .into_tuple::<(i32, i32, Option<String>, ReleaseImageType)>()
        .all(conn)
        .await
        .db_operation("load release image queue targets")?;

    let targets = artist_targets
        .into_iter()
        .map(|(queue_id, artist_id, name, image_type)| {
            let name = name.ok_or_else(|| {
                DatabaseError::broken_reference(BrokenEntityReference {
                    entity: "artist",
                    id: artist_id,
                })
            })?;

            Ok::<_, DatabaseError>((
                queue_id,
                ImageQueueTarget::Artist {
                    artist_id,
                    name,
                    image_type,
                },
            ))
        })
        .chain(release_targets.into_iter().map(
            |(queue_id, release_id, title, image_type)| {
                let title = title.ok_or_else(|| {
                    DatabaseError::broken_reference(BrokenEntityReference {
                        entity: "release",
                        id: release_id,
                    })
                })?;

                Ok::<_, DatabaseError>((
                    queue_id,
                    ImageQueueTarget::Release {
                        release_id,
                        title,
                        image_type,
                    },
                ))
            },
        ));

    let mut targets_by_queue = HashMap::new();
    for target in targets {
        let (queue_id, target) = target?;
        assert!(
            targets_by_queue.insert(queue_id, target).is_none(),
            "image queue {queue_id} must have exactly one target"
        );
    }

    Ok(targets_by_queue)
}
