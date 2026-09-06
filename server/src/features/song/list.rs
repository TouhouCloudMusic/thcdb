use std::collections::{HashMap, HashSet};

use domain::shared::SimpleArtist;
use entity::{artist, release, release_track, song, song_artist};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DerivePartialModel, EntityTrait, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select,
};
use sea_query::NullOrdering;
use serde::Serialize;
use utoipa::ToSchema;

use crate::features::release::list::{
    ReleaseRef, load_artists, load_cover_art_urls,
};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

#[derive(Clone, Debug, Serialize, ToSchema)]
pub(crate) struct SongListItem {
    pub id: i32,
    pub title: String,
    pub cover_art_url: Option<String>,
    pub artists: Vec<SimpleArtist>,
    pub releases: Vec<ReleaseRef>,
}

#[derive(DerivePartialModel)]
#[sea_orm(entity = "song::Entity", from_query_result)]
pub(crate) struct SongRow {
    id: i32,
    title: String,
}

pub(crate) async fn load(
    select: Select<song::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongListItem>, DatabaseError> {
    let songs = select
        .into_partial_model::<SongRow>()
        .all(db)
        .await
        .db_operation("load song list items")?;

    load_items(songs, db).await
}

/// Loads list associations and returns one item per row in the same order.
pub(crate) async fn load_items(
    songs: Vec<SongRow>,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongListItem>, DatabaseError> {
    if songs.is_empty() {
        return Ok(vec![]);
    }

    let song_ids = songs.iter().map(|song| song.id).collect::<Vec<_>>();
    let (artist_rows, release_rows) = tokio::try_join!(
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
            .all(db),
        release_track::Entity::find()
            .select_only()
            .column(release_track::Column::SongId)
            .column(release::Column::Id)
            .column(release::Column::Title)
            .join(JoinType::InnerJoin, release_track::Relation::Release.def())
            .filter(
                release_track::Column::SongId
                    .is_in(song_ids.iter().copied()),
            )
            .order_by_with_nulls(
                release::Column::ReleaseDate,
                sea_orm::Order::Asc,
                NullOrdering::Last,
            )
            .order_by_asc(release::Column::Id)
            .into_tuple::<(i32, i32, String)>()
            .all(db),
    )
    .db_operation("load song list associations")?;

    let mut artists: HashMap<i32, Vec<SimpleArtist>> = HashMap::new();
    for (song_id, id, name) in artist_rows {
        artists
            .entry(song_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }

    let mut seen_releases = HashSet::new();
    let mut releases_by_song: HashMap<i32, Vec<ReleaseRef>> = HashMap::new();
    let mut first_release_ids = Vec::new();
    let mut fallback_release_ids = Vec::new();
    for (song_id, id, title) in release_rows {
        if !seen_releases.insert((song_id, id)) {
            continue;
        }

        let releases = releases_by_song.entry(song_id).or_default();
        if releases.is_empty() {
            first_release_ids.push(id);
            if !artists.contains_key(&song_id) {
                fallback_release_ids.push(id);
            }
        }
        releases.push(ReleaseRef { id, title });
    }

    let (release_artists, cover_art_urls) = tokio::try_join!(
        load_artists(&fallback_release_ids, db),
        load_cover_art_urls(&first_release_ids, db),
    )?;

    Ok(songs
        .into_iter()
        .map(|song| {
            let releases =
                releases_by_song.remove(&song.id).unwrap_or_default();
            let first_release_id = releases.first().map(|release| release.id);
            let artists = artists.remove(&song.id).unwrap_or_else(|| {
                first_release_id
                    .and_then(|release_id| {
                        release_artists.get(&release_id).cloned()
                    })
                    .unwrap_or_default()
            });

            SongListItem {
                id: song.id,
                title: song.title,
                cover_art_url: first_release_id.and_then(|release_id| {
                    cover_art_urls.get(&release_id).cloned()
                }),
                artists,
                releases,
            }
        })
        .collect())
}
