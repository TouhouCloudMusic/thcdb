use axum::extract::State;
use axum::Json;
use entity::song;
use sea_orm::EntityName;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::song::NewSong;
use crate::error::GeneralRepositoryError;
use crate::service::song::SongService;
use crate::state::AppState;

type Error = GeneralRepositoryError;

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
    request_body = CreateSongInput,
    responses(
		(status = 200, description = "Song created successfully"),
		(status = 500, description = "Failed to create song"),
    ),
)]
async fn create_song(
    State(service): State<SongService>,
    Json(input): Json<CreateSongInput>,
) -> Result<(), Error> {
    service.create(input.data).await?;
    Ok(())
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
) -> Result<Json<song::Model>, Error> {
    Ok(Json(service.find_by_id(input.id).await?.ok_or(
        Error::EntityNotFound {
            entity_name: song::Entity.table_name(),
        },
    )?))
}
