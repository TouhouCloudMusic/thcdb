use axum::Json;
use axum::extract::{Path, Query};
use axum::middleware::from_fn;
use macros::{use_service, use_session};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::{Data, Message};
use crate::dto::label::{LabelResponse, NewLabel};
use crate::error::RepositoryError;
use crate::middleware::is_signed_in;
use crate::state::AppState;
use crate::utils::MapInto;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::<AppState>::new()
        .routes(routes!(create_label))
        .routes(routes!(upsert_label_correction))
        .route_layer(from_fn(is_signed_in))
        .routes(routes!(find_label_by_id))
        .routes(routes!(find_label_by_keyword))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/label/{id}",
    responses(
        (status = 200, body = Data<LabelResponse>),
        (status = 401),
        RepositoryError
    ),
)]
#[use_service(label)]
async fn find_label_by_id(
    Path(id): Path<i32>,
) -> Result<Data<LabelResponse>, RepositoryError> {
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
        (status = 200, body = Data<Vec<LabelResponse>>),
        (status = 401),
        RepositoryError
    ),
)]
#[use_service(label)]
async fn find_label_by_keyword(
    Query(query): Query<KwArgs>,
) -> Result<Data<Vec<LabelResponse>>, RepositoryError> {
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
        RepositoryError
    ),
)]
#[use_session]
#[use_service(label)]
async fn create_label(
    Json(data): Json<NewLabel>,
) -> Result<Message, RepositoryError> {
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
                RepositoryError
    ),
)]
#[use_session]
#[use_service(label)]
async fn upsert_label_correction(
    Path(id): Path<i32>,
    Json(data): Json<NewLabel>,
) -> Result<Message, RepositoryError> {
    label_service
        .upsert_correction(session.user.unwrap().id, id, data)
        .await?;

    Ok(Message::ok())
}
