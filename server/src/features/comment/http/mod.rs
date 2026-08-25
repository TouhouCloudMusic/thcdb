use axum::Json;
use axum::extract::{FromRef, Path, Query, State};
use comment_service::{Comment, CommentPage, CreateCommentCommand};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

mod model;

use model::CreateEntityCommentRequest;
pub(crate) use model::EntityCommentTarget;

use super::Service;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, data};
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::shared::http::PaginationQuery;
use crate::shared::http::api_response::{AppError, Data, Message};

impl FromRef<ArcAppState> for Service {
    fn from_ref(state: &ArcAppState) -> Self {
        Self::new(state.sea_orm_repo.clone())
    }
}

#[derive(Clone)]
struct CreateCommentState {
    service: Service,
    user_events: UserEventSender,
}

impl FromRef<ArcAppState> for CreateCommentState {
    fn from_ref(state: &ArcAppState) -> Self {
        Self {
            service: Service::new(state.sea_orm_repo.clone()),
            user_events: state.user_events.clone(),
        }
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(find_entity_comments)))
        .with_private(|r| {
            r.routes(routes!(create_entity_comment))
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
    State(state): State<CreateCommentState>,
    Json(req): Json<CreateEntityCommentRequest>,
) -> Result<Data<Comment>, AppError> {
    let CreateEntityCommentRequest {
        in_reply_to_comment_id,
        content,
        read_through_comment_id,
    } = req;
    let result = state
        .service
        .create_comment(CreateCommentCommand {
            target_kind: target.into(),
            target_id: id,
            author_id: user.id,
            in_reply_to_comment_id,
            content,
            read_through_comment_id,
        })
        .await?;
    state.user_events.publish(
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

#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use std::time::Duration;

    use anyhow::{Context, Result};
    use entity::enums::{
        CorrectionStatus, CorrectionType, EntityType, TagType,
    };
    use entity::{correction, tag};
    use infra_db::SeaOrmRepository;
    use infra_testing::MockUser;
    use sea_orm::ActiveValue::{NotSet, Set};
    use sea_orm::EntityTrait;

    use super::{
        CreateCommentState, CreateEntityCommentRequest, EntityCommentTarget,
        create_entity_comment,
    };
    use crate::adapter::inbound::rest::CurrentUser;
    use crate::features::user_event::{UserEvent, UserEventSender};

    #[tokio::test]
    async fn posting_comment_refreshes_author_when_read_boundary_advances()
    -> Result<()> {
        let conn = infra_testing::test_connection().await;
        let author = MockUser::with_label("comment-read-author")
            .insert(&conn)
            .await?;
        let commenter = MockUser::with_label("comment-read-commenter")
            .insert(&conn)
            .await?;
        let tag = tag::Entity::insert(tag::ActiveModel {
            id: NotSet,
            name: Set(format!("comment-read-target-{}", author.id)),
            r#type: Set(TagType::Genre),
            short_description: Set("Comment notification test".to_owned()),
            description: Set("Comment notification test target".to_owned()),
        })
        .exec_with_returning(&conn)
        .await?;
        let correction = correction::Entity::insert(correction::ActiveModel {
            id: NotSet,
            status: Set(CorrectionStatus::Pending),
            r#type: Set(CorrectionType::Update),
            entity_type: Set(EntityType::Tag),
            entity_id: Set(tag.id),
            created_at: NotSet,
            handled_at: NotSet,
        })
        .exec_with_returning(&conn)
        .await?;

        let repo = SeaOrmRepository::new(conn);
        let comments = comment_service::Service::new(repo.clone());
        comments
            .create_comment(comment_service::CreateCommentCommand {
                target_kind: comment_service::CommentTargetKind::Correction,
                target_id: correction.id,
                author_id: author.id,
                in_reply_to_comment_id: None,
                content: "Subscribe to the discussion".to_owned(),
                read_through_comment_id: None,
            })
            .await?;
        let unread_comment = comments
            .create_comment(comment_service::CreateCommentCommand {
                target_kind: comment_service::CommentTargetKind::Correction,
                target_id: correction.id,
                author_id: commenter.id,
                in_reply_to_comment_id: None,
                content: "Unread discussion activity".to_owned(),
                read_through_comment_id: None,
            })
            .await?;

        let notifications = notification_service::Service::new(repo);
        assert_eq!(notifications.unread_count(author.id).await?.count, 1);

        let user_events = UserEventSender::new(4);
        let mut events = user_events.subscribe();
        create_entity_comment(
            CurrentUser(author.clone().into()),
            axum::extract::Path((
                EntityCommentTarget::Correction,
                correction.id,
            )),
            axum::extract::State(CreateCommentState {
                service: comments,
                user_events,
            }),
            axum::Json(CreateEntityCommentRequest {
                in_reply_to_comment_id: None,
                content: "Reply after reading".to_owned(),
                read_through_comment_id: Some(unread_comment.comment.id),
            }),
        )
        .await?;

        let event = tokio::time::timeout(Duration::from_secs(1), events.recv())
            .await
            .context("notification Inbox update was not published")??;
        assert_eq!(event.event, UserEvent::NotificationInboxUpdated);
        assert!(event.is_for(author.id));
        assert_eq!(notifications.unread_count(author.id).await?.count, 0);

        Ok(())
    }
}
