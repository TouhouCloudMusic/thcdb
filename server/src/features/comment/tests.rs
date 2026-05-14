use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use entity::enums::{
    CorrectionStatus, CorrectionType, DatePrecision, EntityType,
};
use entity::{
    comment_target, comment_thread, correction as correction_entity,
    event as event_entity, label as label_entity, permission, role,
    role_permission, tag as tag_entity, user_role,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder,
};
use snafu::{FromString, OptionExt, ResultExt, Whatever};
use strum::IntoEnumIterator;

use super::model::{
    COMMENT_CONTENT_MAX_LEN, CommentState, CommentTarget,
    CreateEntityCommentRequest,
};
use super::service::Service;
use crate::domain::model::{PermissionName, UserRoleEnum};
use crate::domain::shared::Cursor;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockSong, MockTag, MockUser,
};
use crate::infra::integration_test::test_connection;

fn comment_req(content: &str) -> CreateEntityCommentRequest {
    CreateEntityCommentRequest {
        parent_id: None,
        content: content.to_string(),
    }
}

fn reply_req(parent_id: i32, content: &str) -> CreateEntityCommentRequest {
    CreateEntityCommentRequest {
        parent_id: Some(parent_id),
        content: content.to_string(),
    }
}

const fn cursor(limit: u8, at: i32) -> Cursor {
    Cursor { at, limit }
}

fn error_response(
    result: std::result::Result<impl Sized, impl IntoResponse>,
    context: &str,
) -> std::result::Result<Response, Whatever> {
    match result {
        Ok(_) => Err(Whatever::without_source(format!(
            "{context} succeeded unexpectedly"
        ))),
        Err(err) => Ok(err.into_response()),
    }
}

async fn test_service() -> (sea_orm::DatabaseConnection, Service) {
    let conn = test_connection().await;
    let service = Service::new(SeaOrmRepository::new(conn.clone()));
    (conn, service)
}

async fn create_correction(
    conn: &impl ConnectionTrait,
    label: &str,
) -> std::result::Result<correction_entity::Model, Whatever> {
    let song = MockSong::titled(format!("comment_correction_{label}"))
        .insert(conn)
        .await
        .whatever_context("insert correction comment target song")?;

    correction_entity::Entity::insert(correction_entity::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Pending),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::Song),
        entity_id: Set(song.id),
        created_at: NotSet,
        handled_at: Set(None),
    })
    .exec_with_returning(conn)
    .await
    .whatever_context("insert correction comment target correction")
}

async fn create_target(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    label: &str,
) -> std::result::Result<i32, Whatever> {
    let id = match target {
        CommentTarget::Artist => {
            MockArtist::named(format!("comment_artist_{label}"))
                .insert(conn)
                .await
                .whatever_context("insert comment artist target")?
                .id
        }
        CommentTarget::Release => {
            MockRelease::titled(format!("comment_release_{label}"))
                .insert(conn)
                .await
                .whatever_context("insert comment release target")?
                .id
        }
        CommentTarget::Song => {
            MockSong::titled(format!("comment_song_{label}"))
                .insert(conn)
                .await
                .whatever_context("insert comment song target")?
                .id
        }
        CommentTarget::Label => {
            label_entity::Entity::insert(label_entity::ActiveModel {
                id: NotSet,
                name: Set(format!("comment_label_{label}")),
                founded_date: Set(None),
                founded_date_precision: Set(DatePrecision::Day),
                dissolved_date: Set(None),
                dissolved_date_precision: Set(DatePrecision::Day),
            })
            .exec_with_returning(conn)
            .await
            .whatever_context("insert comment label target")?
            .id
        }
        CommentTarget::Event => {
            event_entity::Entity::insert(event_entity::ActiveModel {
                id: NotSet,
                name: Set(format!("comment_event_{label}")),
                short_description: Set("short".to_string()),
                description: Set("description".to_string()),
                start_date: Set(None),
                start_date_precision: Set(DatePrecision::Day),
                end_date: Set(None),
                end_date_precision: Set(DatePrecision::Day),
                location_country: Set(None),
                location_province: Set(None),
                location_city: Set(None),
            })
            .exec_with_returning(conn)
            .await
            .whatever_context("insert comment event target")?
            .id
        }
        CommentTarget::Tag => {
            MockTag::named(format!("comment_tag_{label}"))
                .insert(conn)
                .await
                .whatever_context("insert comment tag target")?
                .id
        }
        CommentTarget::Correction => create_correction(conn, label).await?.id,
    };

    Ok(id)
}

async fn grant_role(
    conn: &impl ConnectionTrait,
    user_id: i32,
    role: UserRoleEnum,
) -> std::result::Result<(), Whatever> {
    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(user_id),
        role_id: Set(role.into()),
    })
    .exec(conn)
    .await
    .whatever_context("grant user role")?;

    Ok(())
}

async fn grant_custom_permission_role(
    conn: &impl ConnectionTrait,
    user_id: i32,
    permission_name: PermissionName,
    label: &str,
) -> std::result::Result<(), Whatever> {
    let permission = permission::Entity::find()
        .filter(permission::Column::Name.eq(permission_name.as_str()))
        .one(conn)
        .await
        .whatever_context("load permission")?
        .whatever_context("permission should be seeded")?;

    let next_role_id = role::Entity::find()
        .order_by_desc(role::Column::Id)
        .one(conn)
        .await
        .whatever_context("load latest role")?
        .map_or(1, |role| role.id + 1);

    let role = role::Entity::insert(role::ActiveModel {
        id: Set(next_role_id),
        name: Set(format!("comment_test_role_{label}")),
    })
    .exec_with_returning(conn)
    .await
    .whatever_context("insert comment test role")?;

    role_permission::Entity::insert(role_permission::ActiveModel {
        role_id: Set(role.id),
        permission_id: Set(permission.id),
    })
    .exec(conn)
    .await
    .whatever_context("grant permission to comment test role")?;

    user_role::Entity::insert(user_role::ActiveModel {
        user_id: Set(user_id),
        role_id: Set(role.id),
    })
    .exec(conn)
    .await
    .whatever_context("grant comment test role to user")?;

    Ok(())
}

#[tokio::test]
async fn existing_target_without_thread_lists_empty_page()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let song_id = create_target(&conn, CommentTarget::Song, "empty").await?;

    let page = service
        .list_comments(CommentTarget::Song, song_id, cursor(20, 0))
        .await
        .whatever_context("list comments for target without thread")?;

    assert!(page.items.is_empty());
    assert_eq!(page.next_cursor, None);
    assert_eq!(page.active_count, 0);
    Ok(())
}

#[tokio::test]
async fn create_comment_supports_each_mvp_target()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_all_targets_author")
        .insert(&conn)
        .await
        .whatever_context("insert comment author")?;

    for target in CommentTarget::iter() {
        let target_id =
            create_target(&conn, target, &format!("{target:?}")).await?;
        let comment = service
            .create_comment(
                target,
                target_id,
                author.id,
                comment_req("  body with spacing  "),
            )
            .await
            .whatever_context("create comment for target")?;

        assert_eq!(comment.content.as_deref(), Some("  body with spacing  "));

        let page = service
            .list_comments(target, target_id, cursor(20, 0))
            .await
            .whatever_context("list comments for target")?;
        assert_eq!(page.items.len(), 1);
        assert_eq!(page.items[0].id, comment.id);
    }

    Ok(())
}

#[tokio::test]
async fn concurrent_first_comments_share_thread()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_concurrent_author")
        .insert(&conn)
        .await
        .whatever_context("insert concurrent comment author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "concurrent").await?;
    let service_a = service.clone();
    let service_b = service.clone();

    let (first, second) = tokio::join!(
        service_a.create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("first"),
        ),
        service_b.create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("second"),
        ),
    );
    let first = first.whatever_context("create first concurrent comment")?;
    let second = second.whatever_context("create second concurrent comment")?;

    assert_ne!(first.id, second.id);

    let target_refs = comment_target::Entity::find()
        .filter(comment_target::Column::SongId.eq(song_id))
        .all(&conn)
        .await
        .whatever_context("load concurrent comment target_refs")?;
    assert_eq!(target_refs.len(), 1);

    let threads = comment_thread::Entity::find()
        .filter(comment_thread::Column::TargetId.eq(target_refs[0].id))
        .all(&conn)
        .await
        .whatever_context("load concurrent comment threads")?;
    assert_eq!(threads.len(), 1);

    let page = service
        .list_comments(CommentTarget::Song, song_id, cursor(20, 0))
        .await
        .whatever_context("list concurrent comments")?;
    assert_eq!(page.items.len(), 2);

    Ok(())
}

#[tokio::test]
async fn deleting_target_deletes_thread_and_comments()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_cascade_author")
        .insert(&conn)
        .await
        .whatever_context("insert cascade comment author")?;
    let tag_id = create_target(&conn, CommentTarget::Tag, "cascade").await?;

    service
        .create_comment(
            CommentTarget::Tag,
            tag_id,
            author.id,
            comment_req("will be deleted"),
        )
        .await
        .whatever_context("create cascade comment")?;

    let target_ref = comment_target::Entity::find()
        .filter(comment_target::Column::TagId.eq(tag_id))
        .one(&conn)
        .await
        .whatever_context("load cascade comment target_ref")?
        .whatever_context("cascade comment target_ref should exist")?;

    tag_entity::Entity::delete_by_id(tag_id)
        .exec(&conn)
        .await
        .whatever_context("delete comment target")?;

    let thread = comment_thread::Entity::find()
        .filter(comment_thread::Column::TargetId.eq(target_ref.id))
        .one(&conn)
        .await
        .whatever_context("load deleted target comment thread")?;
    assert!(thread.is_none());

    let target_ref = comment_target::Entity::find_by_id(target_ref.id)
        .one(&conn)
        .await
        .whatever_context("load deleted target comment target_ref")?;
    assert!(target_ref.is_none());

    let missing_target_list = error_response(
        service
            .list_comments(CommentTarget::Tag, tag_id, cursor(20, 0))
            .await,
        "list comments for deleted target",
    )?;
    assert_eq!(missing_target_list.status(), StatusCode::NOT_FOUND);

    Ok(())
}

#[tokio::test]
async fn create_comment_rejects_missing_target()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_validation_author")
        .insert(&conn)
        .await
        .whatever_context("insert validation author")?;

    let missing_target = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                999_999_999,
                author.id,
                comment_req("hello"),
            )
            .await,
        "create comment for missing target",
    )?;
    assert_eq!(missing_target.status(), StatusCode::NOT_FOUND);

    Ok(())
}

#[tokio::test]
async fn list_comments_rejects_missing_target()
-> std::result::Result<(), Whatever> {
    let (_, service) = test_service().await;

    let missing_target_list = error_response(
        service
            .list_comments(CommentTarget::Song, 999_999_999, cursor(20, 0))
            .await,
        "list comments for missing target",
    )?;
    assert_eq!(missing_target_list.status(), StatusCode::NOT_FOUND);

    Ok(())
}

#[tokio::test]
async fn create_comment_rejects_empty_content()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_empty_content_author")
        .insert(&conn)
        .await
        .whatever_context("insert empty content author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "empty_content").await?;

    let empty_content = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                comment_req("   "),
            )
            .await,
        "create empty comment",
    )?;
    assert_eq!(empty_content.status(), StatusCode::BAD_REQUEST);

    Ok(())
}

#[tokio::test]
async fn create_comment_rejects_too_long_content()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_too_long_author")
        .insert(&conn)
        .await
        .whatever_context("insert too long content author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "too_long_content").await?;

    let too_long = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                comment_req(&"a".repeat(COMMENT_CONTENT_MAX_LEN + 1)),
            )
            .await,
        "create too long comment",
    )?;
    assert_eq!(too_long.status(), StatusCode::BAD_REQUEST);

    Ok(())
}

#[tokio::test]
async fn parent_comment_must_exist_and_belong_to_same_thread()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_parent_author")
        .insert(&conn)
        .await
        .whatever_context("insert parent author")?;
    let song_id = create_target(&conn, CommentTarget::Song, "parent").await?;
    let other_song_id =
        create_target(&conn, CommentTarget::Song, "other_parent").await?;

    let missing_parent = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                reply_req(999_999, "reply"),
            )
            .await,
        "create reply with missing parent",
    )?;
    assert_eq!(missing_parent.status(), StatusCode::BAD_REQUEST);

    let other_parent = service
        .create_comment(
            CommentTarget::Song,
            other_song_id,
            author.id,
            comment_req("root"),
        )
        .await
        .whatever_context("create parent in other thread")?;

    let cross_thread = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                reply_req(other_parent.id, "reply"),
            )
            .await,
        "create reply with cross-thread parent",
    )?;
    assert_eq!(cross_thread.status(), StatusCode::BAD_REQUEST);

    Ok(())
}

#[tokio::test]
async fn deleted_comment_cannot_be_parent_of_new_reply()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_deleted_parent_author")
        .insert(&conn)
        .await
        .whatever_context("insert deleted parent author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "deleted_parent").await?;
    let parent = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("root"),
        )
        .await
        .whatever_context("create parent comment")?;

    service
        .delete_comment(author.id, parent.id)
        .await
        .whatever_context("delete parent comment")?;

    let deleted_parent = error_response(
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                reply_req(parent.id, "reply"),
            )
            .await,
        "create reply under deleted parent",
    )?;
    assert_eq!(deleted_parent.status(), StatusCode::BAD_REQUEST);

    Ok(())
}

#[tokio::test]
async fn author_can_delete_own_comment() -> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_delete_author")
        .insert(&conn)
        .await
        .whatever_context("insert delete author")?;
    let song_id = create_target(&conn, CommentTarget::Song, "delete").await?;
    let author_comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("owned"),
        )
        .await
        .whatever_context("create author-owned comment")?;
    service
        .delete_comment(author.id, author_comment.id)
        .await
        .whatever_context("author deletes own comment")?;

    Ok(())
}

#[tokio::test]
async fn author_can_delete_already_deleted_comment()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_delete_twice_author")
        .insert(&conn)
        .await
        .whatever_context("insert delete twice author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "delete_twice").await?;
    let author_comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("owned"),
        )
        .await
        .whatever_context("create author-owned comment")?;
    service
        .delete_comment(author.id, author_comment.id)
        .await
        .whatever_context("author deletes own comment")?;
    service
        .delete_comment(author.id, author_comment.id)
        .await
        .whatever_context("author deletes already-deleted comment")?;

    Ok(())
}

#[tokio::test]
async fn comment_manage_permission_allows_deleting_another_users_comment()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_delete_managed_author")
        .insert(&conn)
        .await
        .whatever_context("insert managed delete author")?;
    let manager = MockUser::with_label("comment_delete_manager")
        .insert(&conn)
        .await
        .whatever_context("insert delete manager")?;
    grant_custom_permission_role(
        &conn,
        manager.id,
        PermissionName::CommentManage,
        "comment_manage",
    )
    .await?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "delete_managed").await?;
    let manager_comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("managed"),
        )
        .await
        .whatever_context("create manager-deleted comment")?;
    service
        .delete_comment(manager.id, manager_comment.id)
        .await
        .whatever_context("comment manager deletes another user comment")?;

    Ok(())
}

#[tokio::test]
async fn stranger_cannot_delete_another_users_comment()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_delete_denied_author")
        .insert(&conn)
        .await
        .whatever_context("insert denied delete author")?;
    let stranger = MockUser::with_label("comment_delete_stranger")
        .insert(&conn)
        .await
        .whatever_context("insert delete stranger")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "delete_denied").await?;
    let denied_comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("denied"),
        )
        .await
        .whatever_context("create denied comment")?;
    let denied = error_response(
        service.delete_comment(stranger.id, denied_comment.id).await,
        "stranger deletes another user comment",
    )?;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);

    Ok(())
}

#[tokio::test]
async fn correction_manage_does_not_allow_comment_delete()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_correction_manage_author")
        .insert(&conn)
        .await
        .whatever_context("insert correction manage author")?;
    let reviewer = MockUser::with_label("comment_correction_manage_reviewer")
        .insert(&conn)
        .await
        .whatever_context("insert correction manage reviewer")?;
    grant_custom_permission_role(
        &conn,
        reviewer.id,
        PermissionName::CorrectionManage,
        "correction_manage",
    )
    .await?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "correction_manage").await?;
    let comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("reviewed"),
        )
        .await
        .whatever_context("create comment for correction manage denial")?;

    let denied = error_response(
        service.delete_comment(reviewer.id, comment.id).await,
        "correction manager deletes entity comment",
    )?;
    assert_eq!(denied.status(), StatusCode::FORBIDDEN);

    Ok(())
}

#[tokio::test]
async fn soft_delete_keeps_comment_node_without_content()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_soft_delete_author")
        .insert(&conn)
        .await
        .whatever_context("insert soft delete author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "soft_delete").await?;

    let comment = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            comment_req("body"),
        )
        .await
        .whatever_context("create comment to soft delete")?;
    let reply = service
        .create_comment(
            CommentTarget::Song,
            song_id,
            author.id,
            reply_req(comment.id, "reply"),
        )
        .await
        .whatever_context("create reply under soft-deleted comment")?;

    service
        .delete_comment(author.id, comment.id)
        .await
        .whatever_context("soft delete comment")?;

    let page = service
        .list_comments(CommentTarget::Song, song_id, cursor(20, 0))
        .await
        .whatever_context("list comments after soft delete")?;
    assert_eq!(page.items.len(), 2);
    assert_eq!(page.items[0].id, comment.id);
    assert_eq!(page.items[0].state, CommentState::Deleted);
    assert!(page.items[0].content.is_none());
    assert_eq!(page.items[1].id, reply.id);
    assert_eq!(page.items[1].parent_id, Some(comment.id));
    assert_eq!(page.active_count, 1);

    Ok(())
}

#[tokio::test]
async fn list_comments_paginates_by_cursor_offset()
-> std::result::Result<(), Whatever> {
    let (conn, service) = test_service().await;
    let author = MockUser::with_label("comment_pagination_author")
        .insert(&conn)
        .await
        .whatever_context("insert pagination author")?;
    let song_id =
        create_target(&conn, CommentTarget::Song, "pagination").await?;

    for idx in 0..21 {
        service
            .create_comment(
                CommentTarget::Song,
                song_id,
                author.id,
                comment_req(&format!("comment {idx}")),
            )
            .await
            .whatever_context("create paginated comment")?;
    }

    let first_page = service
        .list_comments(CommentTarget::Song, song_id, cursor(20, 0))
        .await
        .whatever_context("list first comment page")?;
    assert_eq!(first_page.items.len(), 20);
    assert_eq!(first_page.next_cursor, Some(20));
    assert_eq!(first_page.active_count, 21);

    let next_cursor = first_page
        .next_cursor
        .whatever_context("first page should have next cursor")?;
    let second_page = service
        .list_comments(CommentTarget::Song, song_id, cursor(20, next_cursor))
        .await
        .whatever_context("list second comment page")?;
    assert_eq!(second_page.items.len(), 1);
    assert_eq!(second_page.next_cursor, None);
    assert_eq!(second_page.active_count, 21);

    Ok(())
}
