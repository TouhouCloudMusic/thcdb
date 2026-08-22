use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewLabel;
use super::{find, service};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::correction::service::CorrectionUpsertMode;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrectionDto, SubmissionError,
};
use crate::shared::http::api_response::Data;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_label))
                .routes(routes!(upsert_label_correction))
                .routes(routes!(update_label_pending_correction))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn create_label(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service.create(dto.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label/{id}",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn upsert_label_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
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
    path = "/label/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Label id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn update_label_pending_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path((id, correction_id)): Path<(i32, i32)>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
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
