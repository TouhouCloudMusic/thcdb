use std::collections::HashMap;

use domain::shared::DateWithPrecision;
use entity::sea_orm_active_enums::ReleaseImageType;
use entity::{image, release_disc, release_image, release_track};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, JoinType, QueryFilter,
    QueryOrder, QuerySelect, RelationTrait, Select,
};
use serde::Serialize;
use utoipa::ToSchema;

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct ReleaseTrackPosition {
    pub disc_number: i32,
    pub track_number: Option<String>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongRelease {
    pub id: i32,
    pub title: String,
    pub track_positions: Vec<ReleaseTrackPosition>,
    pub release_date: Option<DateWithPrecision>,
    pub cover_art_url: Option<String>,
}

pub async fn load_release_track_positions(
    song_ids: &[i32],
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<(i32, i32), Vec<ReleaseTrackPosition>>, DatabaseError> {
    if song_ids.is_empty() || release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let (discs, tracks) = tokio::try_join!(
        release_disc::Entity::find()
            .select_only()
            .column(release_disc::Column::Id)
            .column(release_disc::Column::ReleaseId)
            .filter(
                release_disc::Column::ReleaseId
                    .is_in(release_ids.iter().copied())
            )
            .order_by_asc(release_disc::Column::ReleaseId)
            .order_by_asc(release_disc::Column::Id)
            .into_tuple::<(i32, i32)>()
            .all(db),
        release_track::Entity::find()
            .select_only()
            .column(release_track::Column::SongId)
            .column(release_track::Column::ReleaseId)
            .column(release_track::Column::DiscId)
            .column(release_track::Column::TrackNumber)
            .filter(
                release_track::Column::SongId.is_in(song_ids.iter().copied())
            )
            .filter(
                release_track::Column::ReleaseId
                    .is_in(release_ids.iter().copied())
            )
            .order_by_asc(release_track::Column::DiscId)
            .order_by_asc(release_track::Column::Id)
            .into_tuple::<(i32, i32, i32, Option<String>)>()
            .all(db),
    )
    .db_context("load release track positions")?;
    let disc_number_by_id = discs
        .chunk_by(|left, right| left.1 == right.1)
        .flat_map(|discs| {
            discs.iter().enumerate().map(|(index, &(id, _))| {
                (
                    id,
                    i32::try_from(index + 1)
                        .expect("release disc count fits in i32"),
                )
            })
        })
        .collect::<HashMap<_, _>>();
    let mut positions = HashMap::<_, Vec<_>>::new();
    for (song_id, release_id, disc_id, track_number) in tracks {
        positions.entry((song_id, release_id)).or_default().push(
            ReleaseTrackPosition {
                disc_number: disc_number_by_id[&disc_id],
                track_number,
            },
        );
    }
    Ok(positions)
}

fn load_release_cover_art_urls_query(
    release_ids: &[i32],
) -> Select<release_image::Entity> {
    release_image::Entity::find()
        .select_only()
        .column(release_image::Column::ReleaseId)
        .column(image::Column::ObjectKey)
        .join(JoinType::InnerJoin, release_image::Relation::Image.def())
        .filter(
            release_image::Column::ReleaseId.is_in(release_ids.iter().copied()),
        )
        .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
}

// Details keep the existing cover lookup; list items select the latest cover.
#[infra_db::observe("song.load_release_cover_art_urls")]
pub async fn load_release_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, DatabaseError> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let cover_art_urls_map = load_release_cover_art_urls_query(release_ids)
        .into_tuple::<(i32, String)>()
        .all(db)
        .await
        .db_context("load release cover art image rows")?
        .into_iter()
        .collect::<HashMap<i32, String>>();

    Ok(cover_art_urls_map)
}
