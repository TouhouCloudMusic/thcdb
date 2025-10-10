use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;

use super::extract::CurrentUser;
use super::router_new;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::api_response::Message;
use crate::application::correction::NewCorrectionDto;
use crate::application::song_lyrics::{CreateError, UpsertCorrectionError};
use crate::domain::song_lyrics::NewSongLyrics;

const TAG: &str = "Song Lyrics";

pub fn router() -> OpenApiRouter<ArcAppState> {
    router_new![create_song_lyrics, update_song_lyrics]
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
