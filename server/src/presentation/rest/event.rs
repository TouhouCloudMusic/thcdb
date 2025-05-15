use axum::Json;
use axum::extract::{Path, Query, State};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::extractor::CurrentUser;
use super::state::{self, ArcAppState};
use crate::api_response::{Data, Message};
use crate::dto::event::{EventCorrection, EventResponse};
use crate::error::ServiceError;
use crate::utils::MapInto;

type Service = state::EventService;

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(upsert_correction))
        .routes(routes!(find_by_id))
        .routes(routes!(find_by_keyword))
}

super::data! {
    DataEventResponse, EventResponse
    DataVecEventResponse, Vec<EventResponse>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event/{id}",
    responses(
        (status = 200, body = Data<EventResponse>),
        ServiceError
    ),
)]
async fn find_by_id(
    State(service): State<Service>,
    Path(id): Path<i32>,
) -> Result<Data<EventResponse>, ServiceError> {
    service.find_by_id(id).await.map_into()
}

#[derive(Deserialize, IntoParams)]
struct KeywordQuery {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/event",
    params(
        KeywordQuery
    ),
    responses(
        (status = 200, body = DataVecEventResponse),
        ServiceError
    ),
)]
async fn find_by_keyword(
    State(service): State<Service>,
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<EventResponse>>, ServiceError> {
    service.find_by_keyword(query.keyword).await.map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event",
    request_body = EventCorrection,
    responses(
        (status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
async fn create(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Json(input): Json<EventCorrection>,
) -> Result<Message, ServiceError> {
    service.create(user.id, input).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/event/{id}",
    request_body = EventCorrection,
    responses(
        (status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
async fn upsert_correction(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Path(id): Path<i32>,
    Json(input): Json<EventCorrection>,
) -> Result<Message, ServiceError> {
    service.upsert_correction(id, &user, input).await?;

    Ok(Message::ok())
}
