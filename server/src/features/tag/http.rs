use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::error::{CreateError, UpsertCorrectionError};
use super::model::NewTag;
use super::{find, service};
use crate::adapter::inbound::rest::api_response::Data;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::application::correction::{
    CorrectionSubmissionResult, NewCorrectionDto,
};

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    let private = AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_tag))
                .routes(routes!(upsert_tag_correction))
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
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn create_tag(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
) -> Result<Data<CorrectionSubmissionResult>, CreateError> {
    let result = service::create(&repo, dto.with_author(user)).await?;
    Ok(Data::from(result))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/tag/{id}",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = Data<CorrectionSubmissionResult>),
    ),
)]
async fn upsert_tag_correction(
    CurrentUser(user): CurrentUser,
    State(repo): State<state::SeaOrmRepository>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
) -> Result<Data<CorrectionSubmissionResult>, UpsertCorrectionError> {
    let result =
        service::upsert_correction(&repo, id, dto.with_author(user)).await?;
    Ok(Data::from(result))
}
