use axum::Json;
use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use macros::use_session;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{self, Data};
use crate::dto::tag::{TagCorrection, TagResponse};
use crate::error::ServiceError;
use crate::middleware::is_signed_in;
use crate::state::AppState;
use crate::utils::MapInto;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create_tag))
        .routes(routes!(upsert_tag_correction))
        .route_layer(from_fn(is_signed_in))
}

#[utoipa::path(
    post,
    path = "/tag/{id}",
    responses(
		(status = 200, body = Data<TagResponse>),
		(status = 401),
        ServiceError
    ),
)]
async fn find_by_id(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<Data<TagResponse>, ServiceError> {
    state.tag_service.find_by_id(id).await.map_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    post,
    path = "/tag",
    params(KwArgs),
    responses(
		(status = 200, body = Data<TagResponse>),
		(status = 401),
        ServiceError
    ),
)]
async fn find_by_keyword(
    State(state): State<AppState>,
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<TagResponse>>, ServiceError> {
    state
        .tag_service
        .find_by_keyword(&query.keyword)
        .await
        .map_into()
}

#[utoipa::path(
    post,
    path = "/tag",
    request_body = TagCorrection,
    responses(
		(status = 200, body = api_response::Message),
		(status = 401),
        ServiceError
    ),
)]
#[use_session]
async fn create_tag(
    State(state): State<AppState>,
    Json(input): Json<TagCorrection>,
) -> Result<api_response::Message, ServiceError> {
    let user_id = session.user.unwrap().id;
    state.tag_service.create(user_id, input).await?;
    Ok(api_response::Message::ok())
}

#[utoipa::path(
    post,
    path = "/tag/{id}",
    request_body = TagCorrection,
    responses(
		(status = 200, body = api_response::Message),
		(status = 401),
        ServiceError
    ),
)]
#[use_session]
async fn upsert_tag_correction(
    State(state): State<AppState>,
    Path(id): Path<i32>,
    Json(input): Json<TagCorrection>,
) -> Result<api_response::Message, ServiceError> {
    let user_id = session.user.unwrap().id;
    state
        .tag_service
        .upsert_correction()
        .tag_id(id)
        .user_id(user_id)
        .data(input)
        .call()
        .await?;

    Ok(api_response::Message::ok())
}
