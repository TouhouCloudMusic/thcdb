use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::NewCreditRole;
use super::{find, service};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmitResult, NewCorrectionDto,
};
use crate::features::correction::SubmissionError;
use crate::features::correction::service::CorrectionUpsertMode;
use crate::shared::http::api_response::Data;

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_credit_role))
                .routes(routes!(upsert_credit_role_correction))
                .routes(routes!(update_credit_role_pending_correction))
        })
        .finish();

    OpenApiRouter::new().merge(find::router()).merge(private)
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn create_credit_role(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(input): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let result = service::create(&repo, input.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role/{id}",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn upsert_credit_role_correction(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let user_id = user.id;
    let result = service::upsert_correction(
        &repo,
        id,
        dto.with_author(user),
        CorrectionUpsertMode::Create,
    )
    .await?;

    if let Some(correction_id) = result.submitted_id() {
        notification
            .notify_correction_needs_review_best_effort(
                correction_id,
                &[user_id],
            )
            .await;
    }

    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role/{id}/correction/{correction_id}",
    params(
        ("id" = i32, Path, description = "Credit role id"),
        ("correction_id" = i32, Path, description = "Pending correction id"),
    ),
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Data<CorrectionSubmitResult>),
    ),
)]
async fn update_credit_role_pending_correction(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    State(notification): State<state::NotificationService>,
    Path((id, correction_id)): Path<(i32, i32)>,
    Json(dto): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Data<CorrectionSubmitResult>, SubmissionError> {
    let user_id = user.id;
    let result = service::upsert_correction(
        &repo,
        id,
        dto.with_author(user),
        CorrectionUpsertMode::Update { correction_id },
    )
    .await?;

    if let Some(correction_id) = result.submitted_id() {
        notification
            .notify_correction_needs_review_best_effort(
                correction_id,
                &[user_id],
            )
            .await;
    }

    Ok(Data::from(result))
}
