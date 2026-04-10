use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::{CreateError, UpsertCorrectionError};
use super::model::NewLabel;
use super::{find, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};
use crate::shared::http::api_response::Data;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_label))
                .routes(routes!(upsert_label_correction))
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
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_label(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service::create(&repo, dto.with_author(user)).await?;
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
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewLabel>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let user_id = user.id;
    let result =
        service::upsert_correction(&repo, id, dto.with_author(user)).await?;

    notification
        .notify_correction_needs_review_best_effort(
            result.correction_id,
            &[user_id],
        )
        .await;

    Ok(Data::from(result))
}
