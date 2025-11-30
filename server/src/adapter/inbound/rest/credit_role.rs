use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::Message;
use crate::adapter::inbound::rest::state::{ArcAppState, CreditRoleService};
use crate::application::correction::NewCorrectionDto;
use crate::application::credit_role::{CreateError, UpsertCorrectionError};
use crate::domain::credit_role::NewCreditRole;

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_credit_role))
                .routes(routes!(upsert_credit_role_correction))
        })
        .finish()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn create_credit_role(
    CurrentUser(user): CurrentUser,
    State(service): State<CreditRoleService>,
    Json(input): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Message, CreateError> {
    service
        .create(input.with_author(user))
        .await
        .map(|()| Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role/{id}",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn upsert_credit_role_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<CreditRoleService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Message, UpsertCorrectionError> {
    service.upsert_correction(id, dto.with_author(user)).await?;

    Ok(Message::ok())
}
