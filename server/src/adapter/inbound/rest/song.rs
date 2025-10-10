use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::api_response::Message;
use crate::application::correction::NewCorrectionDto;
use crate::application::song::{CreateError, UpsertCorrectionError};
use crate::domain::song::NewSong;

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_song))
        .routes(routes!(update_song))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song",
    request_body = NewCorrectionDto<NewSong>,
    responses(
		(status = 200, body = Message),
        (status = 401),
        CreateError
    ),
)]
async fn create_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Json(dto): Json<NewCorrectionDto<NewSong>>,
) -> Result<Message, CreateError> {
    service.create(dto.with_author(user)).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song/{id}",
    request_body = NewCorrectionDto<NewSong>,
    responses(
		(status = 200, body = Message),
        (status = 401),
        UpsertCorrectionError
    ),
)]
async fn update_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Path(song_id): Path<i32>,
    Json(input): Json<NewCorrectionDto<NewSong>>,
) -> Result<Message, UpsertCorrectionError> {
    service
        .upsert_correction(song_id, input.with_author(user))
        .await?;

    Ok(Message::ok())
}
