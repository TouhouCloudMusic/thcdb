use axum::Json;
use axum::extract::{Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::api_response::{self};
use crate::application::correction::NewCorrectionDto;
use crate::application::tag::{CreateError, UpsertCorrectionError};
use crate::domain::tag::NewTag;

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(create_tag))
                .routes(routes!(upsert_tag_correction))
        })
        .finish()
}

#[utoipa::path(
    post,
    path = "/tag",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = api_response::Message),
    ),
)]
async fn create_tag(
    CurrentUser(user): CurrentUser,
    State(tag_service): State<state::TagService>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
) -> Result<api_response::Message, CreateError> {
    tag_service.create(dto.with_author(user)).await?;
    Ok(api_response::Message::ok())
}

#[utoipa::path(
    post,
    path = "/tag/{id}",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = api_response::Message),
    ),
)]
async fn upsert_tag_correction(
    CurrentUser(user): CurrentUser,
    State(tag_service): State<state::TagService>,
    Path(id): Path<i32>,
    Json(dto): Json<NewCorrectionDto<NewTag>>,
) -> Result<api_response::Message, UpsertCorrectionError> {
    tag_service
        .upsert_correction(id, dto.with_author(user))
        .await?;

    Ok(api_response::Message::ok())
}
