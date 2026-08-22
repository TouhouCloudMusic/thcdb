use axum::extract::{Path, Query, State};
use entity::correction;
use sea_orm::EntityTrait;
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
        .with_private(|r| r.routes(routes!(set_correction_subscription)))
        .finish()
}

#[utoipa::path(
    post,
    tag = "Correction",
    path = "/correction/{id}/subscription",
    params(
        ("id" = i32, Path, description = "Correction id"),
        SubscriptionStatus,
    ),
    responses(
        (status = 200, body = DataSubscriptionStatus),
    ),
)]
async fn set_correction_subscription(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<SubscriptionStatus>,
    State(app_state): State<ArcAppState>,
) -> Result<Data<SubscriptionStatus>, AppError> {
    let conn = &app_state.sea_orm_repo.conn;
    let exists = correction::Entity::find_by_id(id)
        .one(conn)
        .await
        .db_operation("check correction exists")?
        .is_some();
    if !exists {
        return Err(AppError::not_found("Correction not found"));
    }
    if query.subscribed {
        correction_subscription::subscribe(conn, user.id, id)
            .await
            .db_operation("subscribe to correction")?;
    } else {
        correction_subscription::unsubscribe(conn, user.id, id)
            .await
            .db_operation("unsubscribe from correction")?;
    }
    Ok(Data::new(query))
}
