use axum::Json;
use axum::extract::{Path, Query};
use axum::middleware::from_fn;
use macros::use_service;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::label::{LabelResponse, NewLabel};
use crate::error::ServiceError;
use crate::middleware::is_signed_in;
use crate::state::{ArcAppState, AuthSession};
use crate::utils::MapInto;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(create_label))
        .routes(routes!(upsert_label_correction))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_label_by_id))
        .routes(routes!(find_label_by_keyword))
}

super::data! {
    DataLabelResponse, LabelResponse
    DataVecLabelResponse, Vec<LabelResponse>
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/{id}",
    responses(
        (status = 200, body = DataLabelResponse),
        (status = 401),
        ServiceError
    ),
)]
#[use_service(label)]
async fn find_label_by_id(
    Path(id): Path<i32>,
) -> Result<Data<LabelResponse>, ServiceError> {
    label_service.find_by_id(id).await.map_into()
}

#[derive(IntoParams, Deserialize)]
struct KwArgs {
    keyword: String,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label",
    params(KwArgs),
    responses(
        (status = 200, body = DataVecLabelResponse),
        (status = 401),
        ServiceError
    ),
)]
#[use_service(label)]
async fn find_label_by_keyword(
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<LabelResponse>>, ServiceError> {
    label_service
        .find_by_keyword(query.keyword)
        .await
        .map_into()
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label",
    request_body = NewLabel,
    responses(
        (status = 200, body = Message),
        (status = 401),
        ServiceError
    ),
)]
#[use_service(label)]
async fn create_label(
    session: AuthSession,
    Json(data): Json<NewLabel>,
) -> Result<Message, ServiceError> {
    label_service.create(session.user.unwrap().id, data).await?;

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/label/{id}",
    request_body = NewLabel,
    responses(
        (status = 200, body = Message),
        (status = 401),
                ServiceError
    ),
)]
#[use_service(label)]
async fn upsert_label_correction(
    session: AuthSession,
    Path(id): Path<i32>,
    Json(data): Json<NewLabel>,
) -> Result<Message, ServiceError> {
    label_service
        .upsert_correction(session.user.unwrap().id, id, data)
        .await?;

    Ok(Message::ok())
}
