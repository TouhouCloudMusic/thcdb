use axum::Json;
use axum::extract::{Path, Query, State};
use libfp::BifunctorExt;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extract::CurrentUser;
use super::state::{
    ArcAppState, {self},
};
use crate::application::correction::NewCorrectionDto;
use crate::application::tag::{CreateError, UpsertCorrectionError};
use crate::domain::tag::NewTag;
use crate::domain::tag::model::Tag;
use crate::infra::error::Error;
use crate::presentation::api_response::{
    Data, {self},
};

const TAG: &str = "Tag";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_tag))
        .routes(routes!(upsert_tag_correction))
        .routes(routes!(find_tag_by_id))
        .routes(routes!(find_tag_by_keyword))
}

super::data! {
    DataOptionTag, Option<Tag>
    DataVecTag, Vec<Tag>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag/{id}",
    responses(
		(status = 200, body = DataOptionTag),
		(status = 401),
        Error
    ),
)]
async fn find_tag_by_id(
    State(tag_service): State<state::TagService>,
    Path(id): Path<i32>,
) -> Result<Data<Option<Tag>>, Error> {
    tag_service.find_by_id(id).await.bimap_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/tag",
    params(KwArgs),
    responses(
		(status = 200, body = DataVecTag),
		(status = 401),
        Error
    ),
)]
async fn find_tag_by_keyword(
    State(tag_service): State<state::TagService>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<Tag>>, Error> {
    tag_service
        .find_by_keyword(&query.keyword)
        .await
        .bimap_into()
}

#[utoipa::path(
    post,
    path = "/tag",
    request_body = NewCorrectionDto<NewTag>,
    responses(
		(status = 200, body = api_response::Message),
		(status = 401),
        Error
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
		(status = 401),
        UpsertCorrectionError
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
