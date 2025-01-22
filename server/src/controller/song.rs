use axum::extract::State;
use axum::Json;
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::dto::song::NewSong;
use crate::error::SongServiceError;
use crate::service::song::SongService;
use crate::state::AppState;

type Error = SongServiceError;
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new().routes(routes!(create_release))
}

#[derive(ToSchema, Deserialize)]
struct CreateSongInput {
    #[serde(flatten)]
    pub data: NewSong,
}

#[utoipa::path(
    post,
    path = "/song",
    request_body = CreateSongInput,
    responses(
		(status = 200, description = "Song create successfully"),
		(status = 500, description = "Song create failed"),
    ),
)]
async fn create_release(
    State(service): State<SongService>,
    Json(input): Json<CreateSongInput>,
) -> Result<(), Error> {
    service.create(input.data).await?;
    Ok(())
}
