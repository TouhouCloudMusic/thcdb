use axum::extract::ws::WebSocketUpgrade;
use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use serde::Serialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::service::Service;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::domain::model::{NotificationKindEnum, NotificationTargetTypeEnum};
use crate::domain::shared::CursorResponse;
use crate::features::notification::ws;
use crate::infra::notification::NotificationHub;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{AppError, Data, Message};

const TAG: &str = "Notification";

data! {
    DataPaginatedNotificationItem, CursorResponse<NotificationItem>
    DataUnreadCount, u64
}

#[derive(Serialize, ToSchema)]
struct NotificationItem {
    id: i32,
    notification_kind: String,
    target_type: String,
    target_id: i32,
    payload: serde_json::Value,
    is_read: bool,
    created_at: chrono::DateTime<chrono::FixedOffset>,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(notification_list))
                .routes(routes!(notification_unread_count))
                .routes(routes!(notification_mark_read))
                .routes(routes!(notification_read_all))
                .routes(routes!(notification_ws))
        })
        .finish()
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/notifications",
    params(PaginationQuery),
    responses((status = 200, body = DataPaginatedNotificationItem)),
)]
async fn notification_list(
    CurrentUser(user): CurrentUser,
    State(service): State<state::NotificationService>,
    Query(pagination): Query<PaginationQuery>,
) -> Result<Data<CursorResponse<NotificationItem>>, AppError> {
    let limit = pagination.limit();
    let cursor = pagination.cursor;
    let paginated = service.list(user.id, limit, cursor).await?;

    let items = paginated.items.into_iter().map(|model| {
        let kind = NotificationKindEnum::from(model.notification_kind_id);
        let target_type =
            NotificationTargetTypeEnum::from(model.target_type_id);

        NotificationItem {
            id: model.id,
            notification_kind: kind.to_string(),
            target_type: target_type.to_string(),
            target_id: model.target_id,
            payload: Service::decode_payload(&model.payload),
            is_read: model.is_read,
            created_at: model.created_at,
        }
    });

    Ok(Data::from(CursorResponse {
        items: items.collect(),
        next_cursor: paginated.next_cursor,
    }))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/notifications/unread-count",
    responses((status = 200, body = DataUnreadCount)),
)]
async fn notification_unread_count(
    CurrentUser(user): CurrentUser,
    State(service): State<state::NotificationService>,
) -> Result<Data<u64>, AppError> {
    let count = service.unread_count(user.id).await?;
    Ok(Data::from(count))
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/notifications/{id}/read",
    responses((status = 200, body = Message)),
)]
async fn notification_mark_read(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<state::NotificationService>,
) -> Result<Message, AppError> {
    service.mark_read(user.id, id).await?;
    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/notifications/read-all",
    responses((status = 200, body = Message)),
)]
async fn notification_read_all(
    CurrentUser(user): CurrentUser,
    State(service): State<state::NotificationService>,
) -> Result<Message, AppError> {
    service.read_all(user.id).await?;
    Ok(Message::ok())
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/ws/notifications",
    responses((status = 101)),
)]
async fn notification_ws(
    ws: WebSocketUpgrade,
    CurrentUser(user): CurrentUser,
    State(hub): State<NotificationHub>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| ws::handle_socket(socket, user.id, hub))
}
