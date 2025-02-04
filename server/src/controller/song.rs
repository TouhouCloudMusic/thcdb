use axum::Json;
use axum::extract::State;
use entity::song;
use sea_orm::EntityName;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Message;
use crate::dto::song::NewSong;
use crate::error::RepositoryError;
use crate::service::song::SongService;
use crate::state::AppState;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create_song))
        .routes(routes!(find_by_id))
}

#[derive(ToSchema, Deserialize)]
struct CreateSongInput {
    #[serde(flatten)]
    pub data: NewSong,
}

#[derive(ToSchema, Deserialize)]
struct FindSongByIdInput {
    pub id: i32,
}

#[utoipa::path(
    post,
    path = "/song",
    request_body = NewSong,
    responses(
		(status = 200, body = Message),
        (status = 401),
        RepositoryError
    ),
)]
async fn create_song(
    State(service): State<SongService>,
    Json(input): Json<NewSong>,
) -> Result<Message, RepositoryError> {
    service.create(input).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    path = "/song",
    request_body = FindSongByIdInput,
    responses(
		(status = 200, description = "Song found by id"),
		(status = 500, description = "Failed to find song by id"),
    ),
)]
async fn find_by_id(
    State(service): State<SongService>,
    Json(input): Json<FindSongByIdInput>,
) -> Result<Json<song::Model>, RepositoryError> {
    Ok(Json(service.find_by_id(input.id).await?.ok_or(
        RepositoryError::EntityNotFound {
            entity_name: song::Entity.table_name(),
        },
    )?))
}
