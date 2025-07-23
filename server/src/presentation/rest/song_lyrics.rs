use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;

use super::extractor::CurrentUser;
use super::router_new;
use super::state::{
    ArcAppState, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::application::song_lyrics::{CreateError, UpsertCorrectionError};
use crate::domain::song_lyrics::model::{NewSongLyrics, SongLyrics};
use crate::domain::song_lyrics::repo::{FindManyFilter, FindOneFilter};
use crate::infra::error::Error;
use crate::presentation::api_response::{Data, Message};
use crate::utils::MapInto;

const TAG: &str = "Song Lyrics";

pub fn router() -> OpenApiRouter<ArcAppState> {
    router_new![
        create_song_lyrics,
        update_song_lyrics,
        find_one_song_lyrics,
        find_many_song_lyrics
    ]
}

super::data! {
    DataOptionSongLyrics, Option<SongLyrics>
    DataVecSongLyrics, Vec<SongLyrics>
}

#[derive(Deserialize, ToSchema, IntoParams)]
struct FindOneSongLyricsQuery {
    song_id: i32,
    language_id: i32,
}

// https://github.com/juhaku/utoipa/issues/1244
// enum into params support
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
		Error
    ),
)]
async fn find_one_song_lyrics(
    State(service): State<state::SongLyricsService>,
    Query(query): Query<FindOneSongLyricsQuery>,
) -> Result<Data<Option<SongLyrics>>, Error> {
    service.find_one(query.into()).await.map_into()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/song-lyrics/many",
    params(FindManySongLyricsQuery),
    responses(
		(status = 200, body = DataVecSongLyrics),
		Error
    ),
)]
async fn find_many_song_lyrics(
    State(service): State<state::SongLyricsService>,
    Query(query): Query<FindManySongLyricsQuery>,
) -> Result<Data<Vec<SongLyrics>>, Error> {
    service.find_many(query.into()).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song-lyrics",
    request_body = NewCorrectionDto<NewSongLyrics>,
    responses(
		(status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]
async fn create_song_lyrics(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongLyricsService>,
    Json(dto): Json<NewCorrectionDto<NewSongLyrics>>,
) -> Result<Message, CreateError> {
    service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song-lyrics/{id}",
    request_body = NewCorrectionDto<NewSongLyrics>,
    responses(
		(status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn update_song_lyrics(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongLyricsService>,
    Path(lyrics_id): Path<i32>,
    Json(input): Json<NewCorrectionDto<NewSongLyrics>>,
) -> Result<Message, UpsertCorrectionError> {
    service
        .upsert_correction(lyrics_id, input.with_author(user))
        .await?;

    Ok(Message::ok())
}
