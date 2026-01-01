use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::{CreateError, UpsertCorrectionError};
use super::model::NewCreditRole;
use super::{find, service};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};

const TAG: &str = "Credit Role";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_credit_role))
                .routes(routes!(upsert_credit_role_correction))
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
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_credit_role(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(input): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service::create(&repo, input.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/credit-role/{id}",
    request_body = NewCorrectionDto<NewCreditRole>,
    responses(
        (status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn upsert_credit_role_correction(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewCreditRole>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result =
        service::upsert_correction(&repo, id, dto.with_author(user)).await?;

    Ok(Data::from(result))
}
