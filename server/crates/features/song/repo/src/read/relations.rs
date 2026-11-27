use std::collections::HashMap;

use domain::shared::{DatePrecision, DateWithPrecision, SimpleArtist};
use entity::enums::SongRelationType;
use entity::{
    artist, release, release_track, song, song_artist, song_relation,
    song_relation_history,
};
use futures_util::FutureExt;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use itertools::Itertools;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, FromQueryResult, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
use sea_query::NullOrdering;
use serde::Serialize;
use utoipa::ToSchema;

use super::releases::{
    SongRelease, load_release_cover_art_urls, load_release_track_positions,
};
use crate::write::SongRelationDirection;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongRelationSummary {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub release: Option<SongRelease>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongRelation {
    pub song: SongRelationSummary,
    pub direction: SongRelationDirection,
    #[serde(rename = "type")]
    pub r#type: SongRelationType,
    pub description: String,
}

#[derive(FromQueryResult)]
struct RelationReleaseRow {
    song_id: i32,
    id: i32,
    title: String,
    release_date: Option<chrono::NaiveDate>,
    release_date_precision: DatePrecision,
}

#[infra_db::observe("song.load_relation_releases")]
async fn load_relation_releases(
    song_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, SongRelease>, DatabaseError> {
    let releases = release_track::Entity::find()
        .select_only()
        .column(release_track::Column::SongId)
        .column(release::Column::Id)
        .column(release::Column::Title)
        .column(release::Column::ReleaseDate)
        .column(release::Column::ReleaseDatePrecision)
        .join(JoinType::InnerJoin, release_track::Relation::Release.def())
        .filter(release_track::Column::SongId.is_in(song_ids.iter().copied()))
        .distinct_on([(release_track::Entity, release_track::Column::SongId)])
        .order_by_asc(release_track::Column::SongId)
        .order_by_with_nulls(
            release::Column::ReleaseDate,
            sea_orm::Order::Asc,
            NullOrdering::Last,
        )
        .order_by_asc(release::Column::Id)
        .into_model::<RelationReleaseRow>()
        .all(db)
        .await
        .db_context("load first related song releases")?;
    let release_ids = releases
        .iter()
        .map(|release| release.id)
        .unique()
        .collect::<Vec<_>>();
    let (cover_art_urls, mut track_positions) = tokio::try_join!(
        load_release_cover_art_urls(&release_ids, db),
        load_release_track_positions(song_ids, &release_ids, db),
    )?;

    Ok(releases
        .into_iter()
        .map(|release| {
            (
                release.song_id,
                SongRelease {
                    id: release.id,
                    title: release.title,
                    release_date: DateWithPrecision::from_option(
                        release.release_date,
                        release.release_date_precision,
                    ),
                    track_positions: track_positions
                        .remove(&(release.song_id, release.id))
                        .unwrap_or_default(),
                    cover_art_url: cover_art_urls.get(&release.id).cloned(),
                },
            )
        })
        .collect())
}

#[infra_db::observe("song.load_relation_summaries")]
async fn load_relation_summaries(
    song_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, SongRelationSummary>, DatabaseError> {
    let (songs, artist_rows, mut releases) = tokio::try_join!(
        song::Entity::find()
            .select_only()
            .column(song::Column::Id)
            .column(song::Column::Title)
            .filter(song::Column::Id.is_in(song_ids.iter().copied()))
            .into_tuple::<(i32, String)>()
            .all(db)
            .map(|result| result.db_context("load related songs")),
        song_artist::Entity::find()
            .select_only()
            .column(song_artist::Column::SongId)
            .column(artist::Column::Id)
            .column(artist::Column::Name)
            .join(JoinType::InnerJoin, song_artist::Relation::Artist.def())
            .filter(
                song_artist::Column::SongId.is_in(song_ids.iter().copied()),
            )
            .order_by_asc(song_artist::Column::ArtistId)
            .into_tuple::<(i32, i32, String)>()
            .all(db)
            .map(|result| result.db_context("load related song artists")),
        load_relation_releases(song_ids, db),
    )
    .db_context("load related song summaries")?;

    let mut artists = HashMap::<_, Vec<_>>::new();
    for (song_id, id, name) in artist_rows {
        artists
            .entry(song_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }
    Ok(songs
        .into_iter()
        .map(|(id, title)| {
            (
                id,
                SongRelationSummary {
                    id,
                    title,
                    artists: artists.remove(&id).unwrap_or_default(),
                    release: releases.remove(&id),
                },
            )
        })
        .collect())
}

fn build_song_relations(
    song_id: i32,
    relations: Vec<song_relation::Model>,
    related_song_map: &HashMap<i32, SongRelationSummary>,
) -> Vec<SongRelation> {
    relations
        .into_iter()
        .filter_map(|relation| {
            let (related_song_id, direction) = if relation.source_id == song_id
            {
                (relation.derived_id, SongRelationDirection::Source)
            } else {
                (relation.source_id, SongRelationDirection::Derived)
            };
            let song = related_song_map.get(&related_song_id).cloned()?;
            Some(SongRelation {
                song,
                direction,
                r#type: relation.relation_type,
                description: relation.description,
            })
        })
        .collect()
}

#[infra_db::observe("song.load_song_relations")]
pub async fn load_song_relations(
    song_id: i32,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongRelation>, DatabaseError> {
    let relations = song_relation::Entity::find()
        .filter(
            song_relation::Column::SourceId
                .eq(song_id)
                .or(song_relation::Column::DerivedId.eq(song_id)),
        )
        .order_by_asc(song_relation::Column::SourceId)
        .order_by_asc(song_relation::Column::DerivedId)
        .order_by_asc(song_relation::Column::RelationType)
        .all(db)
        .await
        .db_context("load song relation rows")?;

    if relations.is_empty() {
        return Ok(vec![]);
    }

    let related_song_ids = relations
        .iter()
        .map(|relation| {
            if relation.source_id == song_id {
                relation.derived_id
            } else {
                relation.source_id
            }
        })
        .collect::<Vec<_>>();

    let related_song_map =
        load_relation_summaries(&related_song_ids, db).await?;

    Ok(build_song_relations(song_id, relations, &related_song_map))
}

#[infra_db::observe("song.load_snapshot_relations")]
pub async fn load_snapshot_relations(
    song_id: i32,
    relations: Vec<song_relation_history::Model>,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongRelation>, DatabaseError> {
    if relations.is_empty() {
        return Ok(vec![]);
    }

    let related_song_ids = relations
        .iter()
        .filter_map(|relation| {
            if relation.source_id == song_id {
                Some(relation.derived_id)
            } else if relation.derived_id == song_id {
                Some(relation.source_id)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    if related_song_ids.is_empty() {
        return Ok(vec![]);
    }

    let related_song_map =
        load_relation_summaries(&related_song_ids, db).await?;
    Ok(relations
        .into_iter()
        .filter_map(|relation| {
            let (related_song_id, direction) = if relation.source_id == song_id
            {
                (relation.derived_id, SongRelationDirection::Source)
            } else if relation.derived_id == song_id {
                (relation.source_id, SongRelationDirection::Derived)
            } else {
                return None;
            };
            let song = related_song_map.get(&related_song_id).cloned()?;
            Some(SongRelation {
                song,
                direction,
                r#type: relation.relation_type,
                description: relation.description,
            })
        })
        .collect())
}
