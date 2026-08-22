use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewTag;
use super::{find, service};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::correction::service::CorrectionUpsertMode;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrectionDto, SubmissionError,
};
use crate::shared::http::api_response::Data;

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_tag))
                .routes(routes!(upsert_tag_correction))
                .routes(routes!(update_tag_pending_correction))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/tag",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn create_tag(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service.create(dto.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/tag/{id}",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn upsert_tag_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
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
    path = "/tag/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Tag id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    request_body = NewCorrectionDto<NewTag>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn update_tag_pending_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<service::Service>,
    Path((id, correction_id)): Path<(i32, i32)>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
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
