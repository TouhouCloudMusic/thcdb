use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::Data;
use crate::application::correction::CorrectionSubmissionResult;
use crate::application::correction::NewCorrectionDto;
use crate::application::song::{CreateError, UpsertCorrectionError};
use crate::domain::song::NewSong;

const TAG: &str = "Song";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_song)).routes(routes!(update_song))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song",
    request_body = NewCorrectionDto<NewSong>,
    responses(
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Json(dto): Json<NewCorrectionDto<NewSong>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service.create(dto.with_author(user)).await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/song/{id}",
    request_body = NewCorrectionDto<NewSong>,
    responses(
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn update_song(
    CurrentUser(user): CurrentUser,
    State(service): State<state::SongService>,
    Path(song_id): Path<i32>,
    Json(input): Json<NewCorrectionDto<NewSong>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result = service
        .upsert_correction(song_id, input.with_author(user))
        .await?;

    Ok(Data::from(result))
}
