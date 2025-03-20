use axum::Json;
use axum::extract::{Path, Query};
use axum::middleware::from_fn;
use macros::{use_service, use_session};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::event::{EventCorrection, EventResponse};
use crate::error::ServiceError;
use crate::middleware::is_signed_in;
use crate::state::AppState;
use crate::utils::MapInto;

const TAG: &str = "Event";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create))
        .routes(routes!(upsert_correction))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_by_id))
        .routes(routes!(find_by_keyword))
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
#[use_service(event)]
async fn find_by_id(
    Path(id): Path<i32>,
) -> Result<Data<EventResponse>, ServiceError> {
    event_service.find_by_id(id).await.map_into()
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
		(status = 200, body = Data<Vec<EventResponse>>),
		ServiceError
	),
)]
#[use_service(event)]
async fn find_by_keyword(
    Query(query): Query<KeywordQuery>,
) -> Result<Data<Vec<EventResponse>>, ServiceError> {
    event_service
        .find_by_keyword(query.keyword)
        .await
        .map_into()
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
#[use_session]
#[use_service(event)]
async fn create(
    Json(input): Json<EventCorrection>,
) -> Result<Message, ServiceError> {
    event_service
        .create(session.user.unwrap().id, input)
        .await?;

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
#[use_session]
#[use_service(event)]
async fn upsert_correction(
    Path(id): Path<i32>,
    Json(input): Json<EventCorrection>,
) -> Result<Message, ServiceError> {
    event_service
        .upsert_correction(id, session.user.unwrap().id, input)
        .await?;

    Ok(Message::ok())
}
