use axum::Json;
use axum::extract::Path;
use axum::middleware::from_fn;
use macros::{use_service, use_session};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Message;
use crate::dto::label::NewLabel;
use crate::error::RepositoryError;
use crate::middleware::is_signed_in;
use crate::state::AppState;

const TAG: &str = "Label";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::<AppState>::new()
        .routes(routes!(create))
        .routes(routes!(upsert_correction))
        .route_layer(from_fn(is_signed_in))
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
async fn create(
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
async fn upsert_correction(
    Path(id): Path<i32>,
    Json(data): Json<NewLabel>,
) -> Result<Message, RepositoryError> {
    label_service
        .upsert_correction(session.user.unwrap().id, id, data)
        .await?;

    Ok(Message::ok())
}
