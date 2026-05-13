use axum::http::StatusCode;
use axum::response::IntoResponse;
use entity::{
    correction as correction_entity, permission, role_permission, user_role,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};

use super::model::{
    COMMENT_CONTENT_MAX_LEN, CommentState, CreateCorrectionCommentRequest,
};
use super::service::Service;
use crate::domain::model::{CorrectionManage, PermissionMarker, UserRoleEnum};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::integration_test::fixture::{MockSong, MockUser};
use crate::infra::integration_test::test_connection;
use crate::shared::http::PaginationQuery;

fn comment_req(content: &str) -> CreateCorrectionCommentRequest {
    CreateCorrectionCommentRequest {
        parent_id: None,
        content: content.to_string(),
    }
}

fn reply_req(parent_id: i32, content: &str) -> CreateCorrectionCommentRequest {
    CreateCorrectionCommentRequest {
        parent_id: Some(parent_id),
        content: content.to_string(),
    }
}

fn pagination(limit: u8, cursor: Option<i32>) -> PaginationQuery {
    serde_json::from_value(serde_json::json!({
        "limit": limit,
        "cursor": cursor,
    }))
    .unwrap()
}

async fn create_correction(
    conn: &impl ConnectionTrait,
    label: &str,
) -> correction_entity::Model {
    let song = MockSong::titled(format!("correction_comment_{label}"))
        .insert(conn)
        .await
        .unwrap();

    correction_entity::Entity::insert(correction_entity::ActiveModel {
        id: NotSet,
        status: Set(entity::enums::CorrectionStatus::Pending),
        r#type: Set(entity::enums::CorrectionType::Update),
        entity_type: Set(entity::enums::EntityType::Song),
        entity_id: Set(song.id),
        created_at: NotSet,
        handled_at: Set(None),
    })
    .exec_with_returning(conn)
    .await
    .unwrap()
}

async fn test_service() -> (sea_orm::DatabaseConnection, Service) {
    let conn = test_connection().await;
    let service = Service::new(SeaOrmRepository::new(conn.clone()));
    (conn, service)
}

async fn grant_role(
    conn: &impl ConnectionTrait,
    user_id: i32,
    role: UserRoleEnum,
) {
    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(user_id),
        role_id: Set(role.into()),
    })
    .exec(conn)
    .await
    .unwrap();
}

async fn grant_user_role_permission<P: PermissionMarker>(
    conn: &impl ConnectionTrait,
) {
    let permission = permission::Entity::find()
        .filter(permission::Column::Name.eq(P::NAME))
        .one(conn)
        .await
        .unwrap()
        .unwrap();
    let role_id = i32::from(UserRoleEnum::User);

    let exists = role_permission::Entity::find()
        .filter(role_permission::Column::RoleId.eq(role_id))
        .filter(role_permission::Column::PermissionId.eq(permission.id))
        .one(conn)
        .await
        .unwrap()
        .is_some();

    if !exists {
        role_permission::Entity::insert(role_permission::ActiveModel {
            role_id: Set(role_id),
            permission_id: Set(permission.id),
        })
        .exec(conn)
        .await
        .unwrap();
    }
}

#[tokio::test]
async fn create_comment_validates_correction_and_content() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_validation_author")
        .insert(&conn)
        .await
        .unwrap();
    let correction = create_correction(&conn, "validation").await;

    let missing_correction = service
        .create_comment(999_999_999, author.id, comment_req("hello"))
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(missing_correction.status(), StatusCode::NOT_FOUND);

    let empty_content = service
        .create_comment(correction.id, author.id, comment_req("   "))
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(empty_content.status(), StatusCode::BAD_REQUEST);

    let too_long = service
        .create_comment(
            correction.id,
            author.id,
            comment_req(&"a".repeat(COMMENT_CONTENT_MAX_LEN + 1)),
        )
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(too_long.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn parent_comment_must_exist_and_belong_to_same_correction() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_parent_author")
        .insert(&conn)
        .await
        .unwrap();
    let correction = create_correction(&conn, "parent").await;
    let other_correction = create_correction(&conn, "other_parent").await;

    let missing_parent = service
        .create_comment(correction.id, author.id, reply_req(999_999, "reply"))
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(missing_parent.status(), StatusCode::BAD_REQUEST);

    let other_parent = service
        .create_comment(other_correction.id, author.id, comment_req("root"))
        .await
        .unwrap();

    let cross_correction = service
        .create_comment(
            correction.id,
            author.id,
            reply_req(other_parent.id, "reply"),
        )
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(cross_correction.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn delete_comment_checks_author_and_comment_manage_permission() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_delete_author")
        .insert(&conn)
        .await
        .unwrap();
    let manager = MockUser::with_label("comment_delete_manager")
        .insert(&conn)
        .await
        .unwrap();
    let stranger = MockUser::with_label("comment_delete_stranger")
        .insert(&conn)
        .await
        .unwrap();
    grant_role(&conn, manager.id, UserRoleEnum::Admin).await;

    let correction = create_correction(&conn, "delete").await;
    let author_comment = service
        .create_comment(correction.id, author.id, comment_req("owned"))
        .await
        .unwrap();
    service
        .delete_comment(author.id, author_comment.id)
        .await
        .unwrap();

    let manager_comment = service
        .create_comment(correction.id, author.id, comment_req("managed"))
        .await
        .unwrap();
    service
        .delete_comment(manager.id, manager_comment.id)
        .await
        .unwrap();

    let denied_comment = service
        .create_comment(correction.id, author.id, comment_req("denied"))
        .await
        .unwrap();
    let denied = service
        .delete_comment(stranger.id, denied_comment.id)
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn correction_manage_does_not_allow_comment_delete() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_correction_manage_author")
        .insert(&conn)
        .await
        .unwrap();
    let reviewer = MockUser::with_label("comment_correction_manage_reviewer")
        .insert(&conn)
        .await
        .unwrap();
    grant_user_role_permission::<CorrectionManage>(&conn).await;
    let correction = create_correction(&conn, "correction_manage").await;
    let comment = service
        .create_comment(correction.id, author.id, comment_req("reviewed"))
        .await
        .unwrap();

    let denied = service
        .delete_comment(reviewer.id, comment.id)
        .await
        .unwrap_err()
        .into_response();
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn soft_delete_keeps_comment_node_without_content() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_soft_delete_author")
        .insert(&conn)
        .await
        .unwrap();
    let correction = create_correction(&conn, "soft_delete").await;

    let comment = service
        .create_comment(correction.id, author.id, comment_req("body"))
        .await
        .unwrap();
    let reply = service
        .create_comment(
            correction.id,
            author.id,
            reply_req(comment.id, "reply"),
        )
        .await
        .unwrap();

    service.delete_comment(author.id, comment.id).await.unwrap();

    let page = service
        .list_comments(correction.id, pagination(20, None))
        .await
        .unwrap();
    assert_eq!(page.items.len(), 2);
    assert_eq!(page.items[0].id, comment.id);
    assert_eq!(page.items[0].state, CommentState::Deleted);
    assert!(page.items[0].content.is_none());
    assert_eq!(page.items[1].id, reply.id);
    assert_eq!(page.items[1].parent_id, Some(comment.id));
}

#[tokio::test]
async fn list_comments_paginates_by_cursor_offset() {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_pagination_author")
        .insert(&conn)
        .await
        .unwrap();
    let correction = create_correction(&conn, "pagination").await;

    for idx in 0..21 {
        service
            .create_comment(
                correction.id,
                author.id,
                comment_req(&format!("comment {idx}")),
            )
            .await
            .unwrap();
    }

    let first_page = service
        .list_comments(correction.id, pagination(20, None))
        .await
        .unwrap();
    assert_eq!(first_page.items.len(), 20);
    assert_eq!(first_page.next_cursor, Some(20));

    let second_page = service
        .list_comments(correction.id, pagination(20, first_page.next_cursor))
        .await
        .unwrap();
    assert_eq!(second_page.items.len(), 1);
    assert_eq!(second_page.next_cursor, None);
}
