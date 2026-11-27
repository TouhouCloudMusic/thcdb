use axum::extract::{Path, Query, State};
use serde::Deserialize;
use song_lyrics_repo::{FindManyFilter, FindOneFilter, SongLyrics};
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::infra::database::cache::LANGUAGE_CACHE;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::Data;

const TAG: &str = "Song Lyrics";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_one_song_lyrics))
                .routes(routes!(find_many_song_lyrics))
                .routes(routes!(find_song_lyrics_by_id))
        })
        .finish()
}

data! {
    DataOptionSongLyrics, Option<SongLyrics>
    DataVecSongLyrics, Vec<SongLyrics>
}

#[derive(Deserialize, ToSchema, IntoParams)]
struct FindOneSongLyricsQuery {
    song_id: i32,
    language_id: i32,
}

#[derive(Deserialize, ToSchema, IntoParams)]
struct FindManySongLyricsQuery {
    song_id: i32,
}

impl From<FindOneSongLyricsQuery> for FindOneFilter {
    fn from(val: FindOneSongLyricsQuery) -> Self {
        Self::SongAndLang {
            song_id: val.song_id,
            language_id: val.language_id,
        }
    }
}

impl From<FindManySongLyricsQuery> for FindManyFilter {
    fn from(val: FindManySongLyricsQuery) -> Self {
        Self::Song {
            song_id: val.song_id,
        }
    }
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song-lyrics",
    params(FindOneSongLyricsQuery),
    responses(
        (status = 200, body = DataOptionSongLyrics),
    ),
)]
async fn find_one_song_lyrics(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<FindOneSongLyricsQuery>,
) -> Result<Data<Option<SongLyrics>>, DatabaseError> {
    Ok(song_lyrics_repo::find_one(&repo.conn, query.into(), || {
        LANGUAGE_CACHE.get_or_init(&repo.conn)
    })
    .await?
    .into())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song-lyrics/many",
    params(FindManySongLyricsQuery),
    responses(
        (status = 200, body = DataVecSongLyrics),
    ),
)]
async fn find_many_song_lyrics(
    State(repo): State<state::SeaOrmRepository>,
    Query(query): Query<FindManySongLyricsQuery>,
) -> Result<Data<Vec<SongLyrics>>, DatabaseError> {
    Ok(song_lyrics_repo::find_many(&repo.conn, query.into(), || {
        LANGUAGE_CACHE.get_or_init(&repo.conn)
    })
    .await?
    .into())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song-lyrics/{id}",
    responses(
        (status = 200, body = DataOptionSongLyrics),
    ),
)]
async fn find_song_lyrics_by_id(
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
) -> Result<Data<Option<SongLyrics>>, DatabaseError> {
    Ok(
        song_lyrics_repo::find_one(
            &repo.conn,
            FindOneFilter::Id { id },
            || LANGUAGE_CACHE.get_or_init(&repo.conn),
        )
        .await?
        .into(),
    )
}
