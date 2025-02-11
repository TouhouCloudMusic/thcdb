use axum::Json;
use axum::extract::{Path, State};
use axum::middleware::from_fn;
use macros::{use_service, use_session};
use serde::Deserialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response;
use crate::dto::correction::Metadata;
use crate::dto::tag::NewTag;
use crate::error::RepositoryError;
use crate::middleware::is_signed_in;
use crate::service::tag::Service;
use crate::state::AppState;
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(create_tag))
        .routes(routes!(upsert_tag_correction))
        .route_layer(from_fn(is_signed_in))
}

#[derive(ToSchema, Deserialize)]
struct TagCorrection {
    #[serde(flatten)]
    #[schema(inline)]
    pub data: NewTag,
    pub correction_metadata: Metadata,
}

#[utoipa::path(
    post,
    path = "/tag",
    request_body = TagCorrection,
    responses(
		(status = 200, body = api_response::Message),
		(status = 401),
        RepositoryError
    ),
)]
#[use_session]
async fn create_tag(
    State(service): State<Service>,
    Json(input): Json<TagCorrection>,
) -> Result<api_response::Message, RepositoryError> {
    let user_id = session.user.unwrap().id;
    service
        .create(user_id, input.data, input.correction_metadata)
        .await?;
    Ok(api_response::Message::ok())
}

#[utoipa::path(
    post,
    path = "/tag/{id}",
    request_body = TagCorrection,
    responses(
		(status = 200, body = api_response::Message),
		(status = 401),
        RepositoryError
    ),
)]
#[use_session]
#[use_service(tag)]
async fn upsert_tag_correction(
    Path(id): Path<i32>,
    Json(input): Json<TagCorrection>,
) -> Result<api_response::Message, RepositoryError> {
    let user_id = session.user.unwrap().id;
    tag_service
        .upsert_correction()
        .tag_id(id)
        .user_id(user_id)
        .data(input.data)
        .correction_metadata(input.correction_metadata)
        .call()
        .await?;

    Ok(api_response::Message::ok())
}
