use std::collections::HashMap;

use entity::{artist, image_queue, release};
use infra_db::error::{
    BrokenEntityReference, DatabaseError, DatabaseFailure, DatabaseResultExt,
};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait,
};

#[derive(Clone, Copy, Debug)]
pub enum QueueTarget {
    Artist(i32),
    Release(i32),
}

impl QueueTarget {
    fn from_ids(
        queue_id: i32,
        artist_id: Option<i32>,
        release_id: Option<i32>,
    ) -> Result<Self, DatabaseError> {
        match (artist_id, release_id) {
            (Some(id), None) => Ok(Self::Artist(id)),
            (None, Some(id)) => Ok(Self::Release(id)),
            _ => Err(DatabaseFailure::internal(format!(
                "Image queue entry {queue_id} must have exactly one target"
            ))
            .context("resolve image queue target")),
        }
    }
}

impl TryFrom<&image_queue::Model> for QueueTarget {
    type Error = DatabaseError;

    fn try_from(queue: &image_queue::Model) -> Result<Self, Self::Error> {
        Self::from_ids(queue.id, queue.artist_id, queue.release_id)
    }
}

pub struct NamedQueueTarget {
    pub target: QueueTarget,
    pub name: String,
}

#[infra_db::observe("image_queue.load_targets")]
pub async fn load_targets(
    conn: &impl ConnectionTrait,
    ids: &[i32],
) -> Result<HashMap<i32, NamedQueueTarget>, DatabaseError> {
    if ids.is_empty() {
        return Ok(HashMap::new());
    }

    let rows = image_queue::Entity::find()
        .select_only()
        .column(image_queue::Column::Id)
        .column(image_queue::Column::ArtistId)
        .column(image_queue::Column::ReleaseId)
        .column(artist::Column::Name)
        .column(release::Column::Title)
        .join(JoinType::LeftJoin, image_queue::Relation::Artist.def())
        .join(JoinType::LeftJoin, image_queue::Relation::Release.def())
        .filter(image_queue::Column::Id.is_in(ids.iter().copied()))
        .into_tuple::<(
            i32,
            Option<i32>,
            Option<i32>,
            Option<String>,
            Option<String>,
        )>()
        .all(conn)
        .await
        .db_context("load image queue targets")?;

    let mut targets = HashMap::with_capacity(rows.len());
    for (queue_id, artist_id, release_id, artist_name, release_title) in rows {
        let target = QueueTarget::from_ids(queue_id, artist_id, release_id)?;
        let (name, entity, id) = match target {
            QueueTarget::Artist(id) => (artist_name, "artist", id),
            QueueTarget::Release(id) => (release_title, "release", id),
        };
        let name = name.ok_or_else(|| {
            DatabaseFailure::broken_reference(BrokenEntityReference {
                entity,
                id,
            })
        })?;
        targets.insert(queue_id, NamedQueueTarget { target, name });
    }

    Ok(targets)
}
