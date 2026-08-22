use std::num::NonZeroU8;
use std::str::FromStr;

use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use domain::shared::{DEFAULT_LIMIT, MAX_LIMIT};
use notification_core::Seq;
use notification_service::{
    NotificationCursor, NotificationListQuery, NotificationPage, Service,
    UnreadCount,
};
use sea_orm::prelude::Uuid;
use serde::Deserialize;
use serde_with::{DisplayFromStr, serde_as};
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::features::user_event::UserEvent;
use crate::shared::http::api_response::{AppError, Data, Message};

const TAG: &str = "Notification";
const DEFAULT_PAGE_LIMIT: NonZeroU8 =
    NonZeroU8::new(DEFAULT_LIMIT).expect("default page limit is non-zero");
const MAX_PAGE_LIMIT: NonZeroU8 =
    NonZeroU8::new(MAX_LIMIT).expect("maximum page limit is non-zero");

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

impl From<notification_service::Error> for AppError {
    fn from(err: notification_service::Error) -> Self {
        match err {
            notification_service::Error::NotFound => {
                Self::not_found("Notification not found")
            }
            notification_service::Error::BadRequest(message) => {
                Self::bad_request(message)
            }
            notification_service::Error::Database(err) => err.into(),
        }
    }
}

data! {
    DataNotificationPage, NotificationPage
    DataUnreadCount, UnreadCount
}

type NonNegativeSequence = Sequence<0>;
type PositiveSequence = Sequence<1>;

#[derive(Clone, Copy, Debug)]
struct Sequence<const MIN: i64>(i64);

impl<const MIN: i64> FromStr for Sequence<MIN> {
    type Err = AppError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        value
            .parse::<i64>()
            .ok()
            .filter(|value| *value >= MIN)
            .map(Self)
            .ok_or_else(|| AppError::bad_request("invalid sequence"))
    }
}

impl<const MIN: i64> From<Sequence<MIN>> for i64 {
    fn from(value: Sequence<MIN>) -> Self {
        value.0
    }
}

impl From<Sequence<1>> for Seq {
    fn from(value: Sequence<1>) -> Self {
        Seq::new(value.0).expect("positive sequence has a non-zero value")
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| {
            r.routes(routes!(list_notifications))
                .routes(routes!(unread_count))
                .routes(routes!(read_all))
                .routes(routes!(mark_read))
                .routes(routes!(mark_unread))
                .routes(routes!(save_notification))
                .routes(routes!(unsave_notification))
        })
        .finish()
}

#[serde_as]
#[derive(Debug, Clone, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct NotificationPageQuery {
    #[param(value_type = u8, required = false, minimum = 1, maximum = 100)]
    limit: Option<NonZeroU8>,
    #[serde_as(as = "Option<DisplayFromStr>")]
    #[param(value_type = String)]
    cursor_snapshot_inbox_seq: Option<NonNegativeSequence>,
    #[serde_as(as = "Option<DisplayFromStr>")]
    #[param(value_type = String)]
    cursor_before_inbox_seq: Option<PositiveSequence>,
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/notifications",
    params(NotificationPageQuery, NotificationListQuery),
    responses(
        (status = 200, body = DataNotificationPage),
    ),
)]
async fn list_notifications(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
    Query(page): Query<NotificationPageQuery>,
    Query(filter): Query<NotificationListQuery>,
) -> Result<Data<NotificationPage>, AppError> {
    let cursor = match (
        page.cursor_snapshot_inbox_seq,
        page.cursor_before_inbox_seq,
    ) {
        (Some(snapshot_inbox_seq), Some(before_inbox_seq)) => {
            Some(NotificationCursor {
                snapshot_inbox_seq: snapshot_inbox_seq.into(),
                before_inbox_seq: before_inbox_seq.into(),
            })
        }
        (None, None) => None,
        _ => {
            return Err(AppError::bad_request(
                "cursor_snapshot_inbox_seq and cursor_before_inbox_seq must be specified together",
            ));
        }
    };

    Ok(Data::from(
        service
            .list_notifications(
                user.id,
                filter,
                cursor,
                page.limit.unwrap_or(DEFAULT_PAGE_LIMIT).min(MAX_PAGE_LIMIT),
            )
            .await?,
    ))
}

#[utoipa::path(
    get,
    tag = TAG,
    path = "/notifications/unread-count",
    responses(
        (status = 200, body = DataUnreadCount),
    ),
)]
async fn unread_count(
    CurrentUser(user): CurrentUser,
    State(service): State<Service>,
) -> Result<Data<UnreadCount>, AppError> {
    Ok(Data::from(service.unread_count(user.id).await?))
}

#[serde_as]
#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
struct ReadAllRequest {
    #[serde_as(as = "DisplayFromStr")]
    #[schema(value_type = String)]
    snapshot_inbox_seq: NonNegativeSequence,
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/notifications/read-all",
    request_body = ReadAllRequest,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn read_all(
    CurrentUser(user): CurrentUser,
    State(app_state): State<ArcAppState>,
    Json(req): Json<ReadAllRequest>,
) -> Result<Message, AppError> {
    let service = Service::new(app_state.sea_orm_repo.clone());
    service
        .read_all(user.id, req.snapshot_inbox_seq.into())
        .await?;
    app_state
        .user_events
        .publish_to_user(UserEvent::NotificationInboxUpdated, user.id);

    Ok(Message::ok())
}

#[serde_as]
#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
struct MarkReadRequest {
    #[serde_as(as = "DisplayFromStr")]
    #[schema(value_type = String)]
    through_seq: PositiveSequence,
}

#[serde_as]
#[derive(Debug, Clone, Deserialize, utoipa::ToSchema)]
struct MarkUnreadRequest {
    #[serde_as(as = "DisplayFromStr")]
    #[schema(value_type = String)]
    from_seq: PositiveSequence,
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/notifications/{notification_id}/read",
    params(
        ("notification_id" = String, Path, description = "Notification id"),
    ),
    request_body = MarkReadRequest,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn mark_read(
    CurrentUser(user): CurrentUser,
    State(app_state): State<ArcAppState>,
    Path(notification_id): Path<String>,
    Json(req): Json<MarkReadRequest>,
) -> Result<Message, AppError> {
    let notification_id = parse_notification_id(&notification_id)?;

    let service = Service::new(app_state.sea_orm_repo.clone());
    service
        .mark_read(user.id, notification_id, req.through_seq.into())
        .await?;
    app_state
        .user_events
        .publish_to_user(UserEvent::NotificationInboxUpdated, user.id);

    Ok(Message::ok())
}

#[utoipa::path(
    post,
    tag = TAG,
    path = "/notifications/{notification_id}/unread",
    params(
        ("notification_id" = String, Path, description = "Notification id"),
    ),
    request_body = MarkUnreadRequest,
    responses(
        (status = 200, body = Message),
    ),
)]
async fn mark_unread(
    CurrentUser(user): CurrentUser,
    State(app_state): State<ArcAppState>,
    Path(notification_id): Path<String>,
    Json(req): Json<MarkUnreadRequest>,
) -> Result<Message, AppError> {
    let notification_id = parse_notification_id(&notification_id)?;

    let service = Service::new(app_state.sea_orm_repo.clone());
    service
        .mark_unread(user.id, notification_id, req.from_seq.into())
        .await?;
    app_state
        .user_events
        .publish_to_user(UserEvent::NotificationInboxUpdated, user.id);

    Ok(Message::ok())
}

#[utoipa::path(
    put,
    tag = TAG,
    path = "/notifications/{notification_id}/saved",
    params(
        ("notification_id" = String, Path, description = "Notification id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn save_notification(
    CurrentUser(user): CurrentUser,
    State(app_state): State<ArcAppState>,
    Path(notification_id): Path<String>,
) -> Result<Message, AppError> {
    let notification_id = parse_notification_id(&notification_id)?;

    let service = Service::new(app_state.sea_orm_repo.clone());
    service.save(user.id, notification_id).await?;
    app_state
        .user_events
        .publish_to_user(UserEvent::NotificationInboxUpdated, user.id);

    Ok(Message::ok())
}

#[utoipa::path(
    delete,
    tag = TAG,
    path = "/notifications/{notification_id}/saved",
    params(
        ("notification_id" = String, Path, description = "Notification id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn unsave_notification(
    CurrentUser(user): CurrentUser,
    State(app_state): State<ArcAppState>,
    Path(notification_id): Path<String>,
) -> Result<Message, AppError> {
    let notification_id = parse_notification_id(&notification_id)?;

    let service = Service::new(app_state.sea_orm_repo.clone());
    service.unsave(user.id, notification_id).await?;
    app_state
        .user_events
        .publish_to_user(UserEvent::NotificationInboxUpdated, user.id);

    Ok(Message::ok())
}

fn parse_notification_id(value: &str) -> Result<Uuid, AppError> {
    Uuid::parse_str(value)
        .map_err(|_| AppError::bad_request("invalid notification_id"))
}
