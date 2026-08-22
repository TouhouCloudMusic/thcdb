use axum::extract::{Path, Query, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::SubscriptionStatus;
use crate::shared::http::api_response::{AppError, Data};

data!(DataSubscriptionStatus, SubscriptionStatus);

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(set_image_queue_subscription)))
        .finish()
}

#[utoipa::path(
    post,
    tag = "Image Queue",
    path = "/image-queue/{id}/subscription",
    params(
        ("id" = i32, Path, description = "Image queue id"),
        SubscriptionStatus,
    ),
    responses(
        (status = 200, body = DataSubscriptionStatus),
    ),
)]
async fn set_image_queue_subscription(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<SubscriptionStatus>,
    State(app_state): State<ArcAppState>,
) -> Result<Data<SubscriptionStatus>, AppError> {
    let conn = &app_state.sea_orm_repo.conn;
    if !image_queue_core::exists(conn, id)
        .await
        .db_operation("check image queue exists")?
    {
        return Err(AppError::not_found("Image queue not found"));
    }
    if query.subscribed {
        image_queue_core::subscribe(conn, user.id, id)
            .await
            .db_operation("subscribe to image queue")?;
    } else {
        image_queue_core::unsubscribe(conn, user.id, id)
            .await
            .db_operation("unsubscribe from image queue")?;
    }
    Ok(Data::new(query))
}
