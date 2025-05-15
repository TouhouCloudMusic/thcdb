use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{self, ArcAppState};
use crate::api_response::{Data, Message};
use crate::dto::release::{ReleaseCorrection, ReleaseResponse};
use crate::error::ServiceError;
use crate::utils::MapInto;

type Service = state::ReleaseService;
type Error = ServiceError;

const TAG: &str = "Release";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_release))
        .routes(routes!(update_release))
        .routes(routes!(find_release_by_keyword))
        .routes(routes!(find_release_by_id))
}

super::data! {
    DataReleaseResponse, ReleaseResponse
    DataVecReleaseResponse, Vec<ReleaseResponse>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release/{id}",
    responses(
		(status = 200, body = DataReleaseResponse),
		Error,
    ),
)]
async fn find_release_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<ReleaseResponse>, Error> {
    service.find_by_id(id).await.map_into()
}

#[derive(IntoParams, Deserialize)]
struct KwQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/release",
    params(KwQuery),
    responses(
		(status = 200, body = DataVecReleaseResponse),
		Error,
    ),
)]
async fn find_release_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KwQuery>,
) -> Result<Data<Vec<ReleaseResponse>>, Error> {
    service.find_by_keyword(query.keyword).await.map_into()
}

#[derive(IntoParams)]
struct RandomReleaseQuery {
    count: u64,
}

// TODO: set count limit, fix return type
#[utoipa::path(
    get,
    path = "/release",
    params(RandomReleaseQuery),
    responses(
		(status = 200),
		Error
    ),
)]
async fn random(
    State(service): State<Service>,
    Query(query): Query<RandomReleaseQuery>,
) -> Result<Data<Vec<entity::release::Model>>, Error> {
    service.random(query.count).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release",
    request_body = ReleaseCorrection,
    responses(
		(status = 200, body = Message),
        (status = 401),
		Error
    ),
)]
async fn create_release(
    CurrentUser(user): CurrentUser,
    service: State<Service>,
    Json(data): Json<ReleaseCorrection>,
) -> Result<Message, Error> {
    let user_id = user.id;
    service.create(data, user_id).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/release/{id}",
    request_body = ReleaseCorrection,
    responses(
		(status = 200, body = Message),
        (status = 401),
		Error
    ),
)]
async fn update_release(
    CurrentUser(user): CurrentUser,
    service: State<Service>,
    Path(id): Path<i32>,
    Json(data): Json<ReleaseCorrection>,
) -> Result<Message, Error> {
    service
        .create_or_update_correction()
        .release_id(id)
        .release_data(data)
        .user(&user)
        .call()
        .await?;

    Ok(Message::ok())
}
