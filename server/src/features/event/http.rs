use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewEvent;
use super::{find, service};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::correction::service::CorrectionUpsertMode;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrectionDto, SubmissionError,
};
use crate::shared::http::api_response::Data;

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_event))
                .routes(routes!(upsert_event_correction))
                .routes(routes!(update_event_pending_correction))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event",
    request_body = NewCorrectionDto<NewEvent>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn create_event(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service.create(dto.with_author(user)).await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event/{id}",
    request_body = NewCorrectionDto<NewEvent>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn upsert_event_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service
        .upsert_correction(
            id,
            dto.with_author(user),
            CorrectionUpsertMode::Create,
        )
        .await?;

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Event id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    request_body = NewCorrectionDto<NewEvent>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn update_event_pending_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path((id, correction_id)): Path<(i32, i32)>,
    Json(dto): Json<NewCorrectionDto<NewEvent>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service
        .upsert_correction(
            id,
            dto.with_author(user),
            CorrectionUpsertMode::Update { correction_id },
        )
        .await?;

    Ok(Data::from(result))
}
