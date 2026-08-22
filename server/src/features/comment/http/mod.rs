use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use comment_service::{Comment, CommentPage, CreateCommentCommand};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

mod model;

use model::CreateEntityCommentRequest;
pub(crate) use model::EntityCommentTarget;

use super::{CommentTargetKind, Service};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::features::user_event::UserEvent;
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{AppError, Data, Message};

impl FromRef<ArcAppState> for Service {
    fn from_ref(state: &ArcAppState) -> Self {
        Self::new(state.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| {
            r.routes(routes!(find_entity_comments))
                .routes(routes!(find_image_queue_comments))
        })
        .with_private(|r| {
            r.routes(routes!(create_entity_comment))
                .routes(routes!(create_image_queue_comment))
                .routes(routes!(delete_comment))
        })
        .finish()
}

data! {
    DataComment, Comment
    DataCommentPage, CommentPage
}

#[utoipa::path(
    get,
    tag = "Comment",
    path = "/{target_type}/{id}/comments",
    params(
        ("target_type" = EntityCommentTarget, Path, description = "Comment target type"),
        ("id" = i32, Path, description = "Target id"),
        PaginationQuery
    ),
    responses(
        (status = 200, body = DataCommentPage),
    ),
)]
async fn find_entity_comments(
    Path((target, id)): Path<(EntityCommentTarget, i32)>,
    Query(pagination): Query<PaginationQuery>,
    State(service): State<Service>,
) -> Result<Data<CommentPage>, AppError> {
    let comments = service
        .list_comments(target.into(), id, pagination.into())
        .await?;
    Ok(Data::new(comments))
}

#[utoipa::path(
    post,
    tag = "Comment",
    path = "/{target_type}/{id}/comments",
    params(
        ("target_type" = EntityCommentTarget, Path, description = "Comment target type"),
        ("id" = i32, Path, description = "Target id"),
    ),
    request_body = CreateEntityCommentRequest,
    responses(
        (status = 200, body = DataComment),
    ),
)]
async fn create_entity_comment(
    CurrentUser(user): CurrentUser,
    Path((target, id)): Path<(EntityCommentTarget, i32)>,
    State(app_state): State<ArcAppState>,
    Json(req): Json<CreateEntityCommentRequest>,
) -> Result<Data<Comment>, AppError> {
    let CreateEntityCommentRequest {
        in_reply_to_comment_id,
        content,
        read_through_comment_id,
    } = req;
    let result = Service::new(app_state.sea_orm_repo.clone())
        .create_comment(CreateCommentCommand {
            target_kind: target.into(),
            target_id: id,
            author_id: user.id,
            in_reply_to_comment_id,
            content,
            read_through_comment_id,
        })
        .await?;
    app_state.user_events.publish(
        UserEvent::NotificationInboxUpdated,
        result.notification_recipients.user_ids,
    );

    Ok(Data::new(result.comment))
}

#[utoipa::path(
    get,
    tag = "Comment",
    path = "/image-queue/{id}/comments",
    params(
        ("id" = i32, Path, description = "Image queue id"),
        PaginationQuery
    ),
    responses(
        (status = 200, body = DataCommentPage),
    ),
)]
async fn find_image_queue_comments(
    Path(id): Path<i32>,
    Query(pagination): Query<PaginationQuery>,
    State(service): State<Service>,
) -> Result<Data<CommentPage>, AppError> {
    let comments = service
        .list_comments(CommentTargetKind::ImageQueue, id, pagination.into())
        .await?;
    Ok(Data::new(comments))
}

#[utoipa::path(
    post,
    tag = "Comment",
    path = "/image-queue/{id}/comments",
    params(
        ("id" = i32, Path, description = "Image queue id"),
    ),
    request_body = CreateEntityCommentRequest,
    responses(
        (status = 200, body = DataComment),
    ),
)]
async fn create_image_queue_comment(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(app_state): State<ArcAppState>,
    Json(req): Json<CreateEntityCommentRequest>,
) -> Result<Data<Comment>, AppError> {
    let CreateEntityCommentRequest {
        in_reply_to_comment_id,
        content,
        read_through_comment_id,
    } = req;
    let result = Service::new(app_state.sea_orm_repo.clone())
        .create_comment(CreateCommentCommand {
            target_kind: CommentTargetKind::ImageQueue,
            target_id: id,
            author_id: user.id,
            in_reply_to_comment_id,
            content,
            read_through_comment_id,
        })
        .await?;
    app_state.user_events.publish(
        UserEvent::NotificationInboxUpdated,
        result.notification_recipients.user_ids,
    );

    Ok(Data::new(result.comment))
}

#[utoipa::path(
    delete,
    tag = "Comment",
    path = "/comment/{id}",
    params(
        ("id" = i32, Path, description = "Comment id"),
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn delete_comment(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Message, AppError> {
    service.delete_comment(user.id, id).await?;
    Ok(Message::ok())
}
