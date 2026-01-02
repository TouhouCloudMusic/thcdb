use axum::extract::{Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::repo::{self, FindManyFilter, FindOneFilter};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::song_lyrics::model::SongLyrics;
use crate::infra::error::Error;

const TAG: &str = "Song Lyrics";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_one_song_lyrics))
                .routes(routes!(find_many_song_lyrics))
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
) -> Result<Data<Option<SongLyrics>>, Error> {
    repo::find_one(&repo, query.into()).await.bimap_into()
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
) -> Result<Data<Vec<SongLyrics>>, Error> {
    repo::find_many(&repo, query.into()).await.bimap_into()
}
