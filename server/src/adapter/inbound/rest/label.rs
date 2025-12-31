use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state;
use super::state::ArcAppState;
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::Data;
use crate::application::correction::CorrectionSubmissionResult;
use crate::application::correction::NewCorrectionDto;
use crate::application::label::{CreateError, UpsertCorrectionError};
use crate::domain::label::NewLabel;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_label))
                .routes(routes!(upsert_label_correction))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]

async fn create_label(
    CurrentUser(user): CurrentUser,
    label_service: State<state::LabelService>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = label_service.create(dto.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label/{id}",
    request_body = NewCorrectionDto<NewLabel>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn upsert_label_correction(
    CurrentUser(user): CurrentUser,
    label_service: State<state::LabelService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result = label_service
        .upsert_correction(id, dto.with_author(user))
        .await?;

    Ok(Data::from(result))
}
