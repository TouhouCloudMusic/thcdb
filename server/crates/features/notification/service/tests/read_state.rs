use std::collections::BTreeSet;
use std::num::{NonZeroU8, NonZeroU16};

use anyhow::{Context, ensure};
use chrono::{Duration, Utc};
use comment_service::{CommentTargetKind, CreateCommentCommand};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType, TagType};
use entity::{correction, notification_entry, tag};
use infra_db::SeaOrmRepository;
use infra_testing::MockUser;
use notification_core::Seq;
use notification_service::{
    Error, NotificationBody, NotificationItem, NotificationListQuery,
    NotificationState, Service,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Uuid;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, TransactionTrait};
use sea_query::Expr;

struct AccountNotification {
    repo: SeaOrmRepository,
    service: Service,
    recipient_id: i32,
    actor_id: i32,
    notification_id: Uuid,
}

async fn create_role_changed_notification(
    repo: &SeaOrmRepository,
    actor_id: i32,
    recipient_id: i32,
) -> anyhow::Result<()> {
    let tx = repo.conn.begin().await?;
    let _recipients = account_notification::create_role_changed_notification(
        &tx,
        actor_id,
        recipient_id,
        BTreeSet::from([2]),
    )
    .await?;
    tx.commit().await?;

    Ok(())
}

async fn create_account_notification(
    label: &str,
) -> anyhow::Result<AccountNotification> {
    let conn = infra_testing::test_connection().await;
    let actor = MockUser::with_label(format!("{label}-actor"))
        .insert(&conn)
        .await?;
    let recipient = MockUser::with_label(format!("{label}-recipient"))
        .insert(&conn)
        .await?;

    let repo = SeaOrmRepository::new(conn);
    create_role_changed_notification(&repo, actor.id, recipient.id).await?;

    let service = Service::new(repo.clone());
    let notification = only_notification(&service, recipient.id).await?;
    ensure!(
        notification.through_seq == "1",
        "new single-event notification must end at sequence 1"
    );

    Ok(AccountNotification {
        repo,
        service,
        recipient_id: recipient.id,
        actor_id: actor.id,
        notification_id: notification.id,
    })
}

async fn only_notification(
    service: &Service,
    recipient_id: i32,
) -> anyhow::Result<NotificationItem> {
    let page = service
        .list_notifications(
            recipient_id,
            NotificationListQuery {
                state: NotificationState::default(),
                category: None,
            },
            None,
            NonZeroU8::MIN,
        )
        .await?;
    ensure!(
        page.next_cursor.is_none(),
        "expected exactly one notification"
    );
    let notification = page
        .items
        .into_iter()
        .next()
        .context("expected one notification")?;

    Ok(notification)
}

async fn create_correction_comment(
    service: &comment_service::Service,
    correction_id: i32,
    author_id: i32,
    content: &str,
) -> anyhow::Result<()> {
    service
        .create_comment(CreateCommentCommand {
            target_kind: CommentTargetKind::Correction,
            target_id: correction_id,
            author_id,
            in_reply_to_comment_id: None,
            content: content.to_owned(),
            read_through_comment_id: None,
        })
        .await?;

    Ok(())
}

struct ThreadNotification {
    repo: SeaOrmRepository,
    service: Service,
    recipient_id: i32,
    notification_id: Uuid,
    correction_id: i32,
    first_commenter_id: i32,
    latest_commenter_id: i32,
}

async fn create_thread_notification(
    label: &str,
) -> anyhow::Result<ThreadNotification> {
    let conn = infra_testing::test_connection().await;
    let recipient_fixture = MockUser::with_label(format!("{label}-recipient"));
    let fixture_suffix = recipient_fixture.suffix;
    let recipient = recipient_fixture.insert(&conn).await?;
    let first_commenter =
        MockUser::with_label(format!("{label}-first-commenter"))
            .insert(&conn)
            .await?;
    let latest_commenter =
        MockUser::with_label(format!("{label}-latest-commenter"))
            .insert(&conn)
            .await?;

    let tag = tag::Entity::insert(tag::ActiveModel {
        id: NotSet,
        name: Set(format!("{label}-{fixture_suffix}")),
        r#type: Set(TagType::Genre),
        short_description: Set("Notification read state test".to_owned()),
        description: Set("Notification read state test target".to_owned()),
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
    let comment_service = comment_service::Service::new(repo.clone());
    create_correction_comment(
        &comment_service,
        correction.id,
        recipient.id,
        "Subscribe to the thread",
    )
    .await?;
    create_correction_comment(
        &comment_service,
        correction.id,
        first_commenter.id,
        "First notification activity",
    )
    .await?;
    create_correction_comment(
        &comment_service,
        correction.id,
        latest_commenter.id,
        "Latest notification activity",
    )
    .await?;

    let service = Service::new(repo.clone());
    let notification = only_notification(&service, recipient.id).await?;
    ensure!(
        notification.through_seq == "2",
        "two delivered activities must end at sequence 2"
    );

    Ok(ThreadNotification {
        repo,
        service,
        recipient_id: recipient.id,
        notification_id: notification.id,
        correction_id: correction.id,
        first_commenter_id: first_commenter.id,
        latest_commenter_id: latest_commenter.id,
    })
}

#[tokio::test]
async fn marking_notification_unread_increases_unread_count()
-> anyhow::Result<()> {
    let notification =
        create_account_notification("mark-notification-unread").await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await?;
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        0
    );

    notification
        .service
        .mark_unread(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await?;
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        1
    );

    Ok(())
}

#[tokio::test]
async fn marking_latest_thread_activity_unread_keeps_earlier_activity_read()
-> anyhow::Result<()> {
    let notification = create_thread_notification("thread-unread").await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await?;
    notification
        .service
        .mark_unread(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await?;

    let item =
        only_notification(&notification.service, notification.recipient_id)
            .await?;
    assert!(item.is_unread);
    let NotificationBody::CommentThreadUpdated {
        commenters,
        additional_commenter_count,
        ..
    } = item.body
    else {
        anyhow::bail!("expected a comment thread notification");
    };
    assert_eq!(
        commenters
            .into_iter()
            .map(|commenter| commenter.id)
            .collect::<Vec<_>>(),
        [notification.latest_commenter_id]
    );
    assert_eq!(additional_commenter_count, 0);

    Ok(())
}

#[tokio::test]
async fn marking_later_activity_unread_keeps_earlier_activity_unread()
-> anyhow::Result<()> {
    let notification =
        create_thread_notification("already-unread-thread").await?;

    notification
        .service
        .mark_unread(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await?;

    let item =
        only_notification(&notification.service, notification.recipient_id)
            .await?;
    assert!(item.is_unread);
    let NotificationBody::CommentThreadUpdated {
        commenters,
        additional_commenter_count,
        ..
    } = item.body
    else {
        anyhow::bail!("expected a comment thread notification");
    };
    assert_eq!(commenters.len(), 2);
    assert!(
        commenters
            .iter()
            .any(|commenter| commenter.id == notification.first_commenter_id)
    );
    assert!(
        commenters
            .iter()
            .any(|commenter| commenter.id == notification.latest_commenter_id)
    );
    assert_eq!(additional_commenter_count, 0);

    Ok(())
}

#[tokio::test]
async fn older_read_boundary_does_not_make_notification_unread()
-> anyhow::Result<()> {
    let notification =
        create_thread_notification("older-read-boundary").await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await?;
    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await?;

    let item =
        only_notification(&notification.service, notification.recipient_id)
            .await?;
    assert!(!item.is_unread);

    Ok(())
}

#[tokio::test]
async fn reading_all_marks_only_notifications_in_snapshot() -> anyhow::Result<()>
{
    let notification =
        create_account_notification("read-notification-snapshot").await?;
    create_role_changed_notification(
        &notification.repo,
        notification.actor_id,
        notification.recipient_id,
    )
    .await?;

    let snapshot_page = notification
        .service
        .list_notifications(
            notification.recipient_id,
            NotificationListQuery {
                state: NotificationState::default(),
                category: None,
            },
            None,
            NonZeroU8::new(2).context("page size must be nonzero")?,
        )
        .await?;
    ensure!(
        snapshot_page.items.len() == 2 && snapshot_page.next_cursor.is_none(),
        "expected two notifications in the snapshot"
    );
    let snapshot_notification_ids = snapshot_page
        .items
        .into_iter()
        .map(|item| item.id)
        .collect::<Vec<_>>();

    create_role_changed_notification(
        &notification.repo,
        notification.actor_id,
        notification.recipient_id,
    )
    .await?;

    notification
        .service
        .read_all(notification.recipient_id, snapshot_page.snapshot_inbox_seq)
        .await?;

    let page = notification
        .service
        .list_notifications(
            notification.recipient_id,
            NotificationListQuery {
                state: NotificationState::default(),
                category: None,
            },
            None,
            NonZeroU8::new(3).context("page size must be nonzero")?,
        )
        .await?;
    ensure!(
        page.items.len() == 3 && page.next_cursor.is_none(),
        "expected notifications on both sides of the snapshot"
    );
    let mut later_notification_count = 0;
    for item in page.items {
        if snapshot_notification_ids.contains(&item.id) {
            assert!(!item.is_unread);
        } else {
            assert!(item.is_unread);
            later_notification_count += 1;
        }
    }
    assert_eq!(later_notification_count, 1);

    Ok(())
}

#[tokio::test]
async fn reading_all_keeps_later_activity_unread() -> anyhow::Result<()> {
    let notification =
        create_thread_notification("read-later-thread-activity").await?;
    let snapshot_page = notification
        .service
        .list_notifications(
            notification.recipient_id,
            NotificationListQuery {
                state: NotificationState::default(),
                category: None,
            },
            None,
            NonZeroU8::MIN,
        )
        .await?;
    ensure!(
        snapshot_page.items.len() == 1 && snapshot_page.next_cursor.is_none(),
        "expected one notification in the snapshot"
    );

    let later_commenter =
        MockUser::with_label("read-later-thread-activity-commenter")
            .insert(&notification.repo.conn)
            .await?;
    let comment_service =
        comment_service::Service::new(notification.repo.clone());
    create_correction_comment(
        &comment_service,
        notification.correction_id,
        later_commenter.id,
        "Activity after the notification snapshot",
    )
    .await?;

    notification
        .service
        .read_all(notification.recipient_id, snapshot_page.snapshot_inbox_seq)
        .await?;

    let item =
        only_notification(&notification.service, notification.recipient_id)
            .await?;
    assert!(item.is_unread);
    let NotificationBody::CommentThreadUpdated {
        commenters,
        additional_commenter_count,
        ..
    } = item.body
    else {
        anyhow::bail!("expected a comment thread notification");
    };
    assert_eq!(
        commenters
            .into_iter()
            .map(|commenter| commenter.id)
            .collect::<Vec<_>>(),
        [later_commenter.id]
    );
    assert_eq!(additional_commenter_count, 0);

    Ok(())
}

#[tokio::test]
async fn marking_read_past_last_event_is_rejected() -> anyhow::Result<()> {
    let notification =
        create_account_notification("mark-notification-read-too-far").await?;

    let result = notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await;
    let Err(Error::BadRequest(message)) = result else {
        anyhow::bail!("expected an invalid read boundary error");
    };
    assert_eq!(message, "Read boundary exceeds notification sequence");
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        1
    );

    Ok(())
}

#[tokio::test]
async fn marking_unread_past_last_event_is_rejected() -> anyhow::Result<()> {
    let notification =
        create_account_notification("mark-notification-unread-too-far").await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await?;

    let result = notification
        .service
        .mark_unread(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await;
    let Err(Error::BadRequest(message)) = result else {
        anyhow::bail!("expected an invalid unread boundary error");
    };
    assert_eq!(message, "Unread boundary is no longer available");
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        0
    );

    Ok(())
}

#[tokio::test]
async fn marking_purged_entry_unread_is_rejected() -> anyhow::Result<()> {
    let notification = create_thread_notification("expired-unread").await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<2>(),
        )
        .await?;

    notification_entry::Entity::update_many()
        .col_expr(
            notification_entry::Column::CreatedAt,
            Expr::value(Utc::now().fixed_offset() - Duration::days(2)),
        )
        .filter(
            notification_entry::Column::NotificationId
                .eq(notification.notification_id),
        )
        .filter(notification_entry::Column::Seq.eq(1))
        .exec(&notification.repo.conn)
        .await?;
    notification_cleanup::run(&notification.repo.conn, NonZeroU16::MIN).await?;

    let result = notification
        .service
        .mark_unread(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await;
    let Err(Error::BadRequest(message)) = result else {
        anyhow::bail!("expected an unavailable unread boundary error");
    };
    assert_eq!(message, "Unread boundary is no longer available");

    let item =
        only_notification(&notification.service, notification.recipient_id)
            .await?;
    assert!(!item.is_unread);

    Ok(())
}

#[tokio::test]
async fn another_user_cannot_mark_notification_read() -> anyhow::Result<()> {
    let notification =
        create_account_notification("mark-another-users-notification").await?;

    let result = notification
        .service
        .mark_read(
            notification.actor_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await;
    ensure!(
        matches!(result, Err(Error::NotFound)),
        "another user's notification must not be visible"
    );
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        1
    );

    Ok(())
}

#[tokio::test]
async fn another_user_cannot_mark_notification_unread() -> anyhow::Result<()> {
    let notification =
        create_account_notification("mark-another-users-notification-unread")
            .await?;

    notification
        .service
        .mark_read(
            notification.recipient_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await?;

    let result = notification
        .service
        .mark_unread(
            notification.actor_id,
            notification.notification_id,
            Seq::new_static::<1>(),
        )
        .await;
    ensure!(
        matches!(result, Err(Error::NotFound)),
        "another user's notification must not be visible"
    );
    assert_eq!(
        notification
            .service
            .unread_count(notification.recipient_id)
            .await?
            .count,
        0
    );

    Ok(())
}
