use std::num::{NonZeroU8, NonZeroU16};

use anyhow::{Context, ensure};
use chrono::{Duration, Utc};
use entity::enums::{CorrectionStatus, CorrectionType, EntityType, TagType};
use entity::{correction, notification, tag};
use infra_db::SeaOrmRepository;
use infra_testing::MockUser;
use notification_core::CreateNotificationsCommand;
use notification_service::{
    NotificationItem, NotificationListQuery, NotificationState, Service,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, TransactionTrait,
};
use sea_query::Expr;

struct NotificationFixture {
    conn: DatabaseConnection,
    service: Service,
    recipients: Vec<i32>,
    notification_ids: Vec<Uuid>,
}

impl NotificationFixture {
    async fn create(
        label: &str,
        recipient_count: usize,
    ) -> anyhow::Result<Self> {
        let conn = infra_testing::test_connection().await;
        let actor_fixture = MockUser::with_label(format!("{label}-actor"));
        let fixture_suffix = actor_fixture.suffix;
        let actor = actor_fixture.insert(&conn).await?;

        let mut recipients = Vec::with_capacity(recipient_count);
        for index in 0..recipient_count {
            let recipient =
                MockUser::with_label(format!("{label}-recipient-{index}"))
                    .insert(&conn)
                    .await?;
            recipients.push(recipient.id);
        }

        let tag = tag::Entity::insert(tag::ActiveModel {
            id: NotSet,
            name: Set(format!("{label}-{fixture_suffix}")),
            r#type: Set(TagType::Genre),
            short_description: Set("Notification cleanup test".to_owned()),
            description: Set("Notification cleanup test target".to_owned()),
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

        let tx = conn.begin().await?;
        let _ = notification_core::create_notifications(
            &tx,
            CreateNotificationsCommand::CorrectionReviewRequested {
                actor_id: actor.id,
                recipients: recipients.clone(),
                correction_id: correction.id,
            },
        )
        .await?;
        tx.commit().await?;

        let service = Service::new(SeaOrmRepository::new(conn.clone()));
        let mut notification_ids = Vec::with_capacity(recipient_count);
        for &recipient_id in &recipients {
            let item = only_notification(&service, recipient_id).await?;
            notification_ids.push(item.id);
        }

        Ok(Self {
            conn,
            service,
            recipients,
            notification_ids,
        })
    }

    async fn expire(&self) -> anyhow::Result<()> {
        let expired_at = Utc::now().fixed_offset() - Duration::days(2);
        notification::Entity::update_many()
            .col_expr(
                notification::Column::LastActivityAt,
                Expr::value(expired_at),
            )
            .filter(
                notification::Column::Id
                    .is_in(self.notification_ids.iter().copied()),
            )
            .exec(&self.conn)
            .await?;

        Ok(())
    }
}

async fn list_notifications(
    service: &Service,
    recipient_id: i32,
) -> anyhow::Result<Vec<NotificationItem>> {
    Ok(service
        .list_notifications(
            recipient_id,
            NotificationListQuery {
                state: NotificationState::default(),
                category: None,
            },
            None,
            NonZeroU8::MIN,
        )
        .await?
        .items)
}

async fn only_notification(
    service: &Service,
    recipient_id: i32,
) -> anyhow::Result<NotificationItem> {
    let mut notifications = list_notifications(service, recipient_id).await?;
    ensure!(
        notifications.len() == 1,
        "expected exactly one notification"
    );

    notifications.pop().context("expected one notification")
}

#[tokio::test]
async fn cleanup_removes_expired_notification() -> anyhow::Result<()> {
    let fixture = NotificationFixture::create("cleanup-expired", 1).await?;
    fixture.expire().await?;

    notification_cleanup::run(&fixture.conn, NonZeroU16::MIN).await?;

    let notifications =
        list_notifications(&fixture.service, fixture.recipients[0]).await?;
    ensure!(
        notifications.is_empty(),
        "expired notification must be removed"
    );

    Ok(())
}

#[tokio::test]
async fn cleanup_keeps_saved_notification_when_another_copy_expires()
-> anyhow::Result<()> {
    let fixture = NotificationFixture::create("cleanup-saved", 2).await?;
    fixture
        .service
        .save(fixture.recipients[0], fixture.notification_ids[0])
        .await?;
    fixture.expire().await?;

    notification_cleanup::run(&fixture.conn, NonZeroU16::MIN).await?;

    let saved =
        only_notification(&fixture.service, fixture.recipients[0]).await?;
    ensure!(
        saved.saved_at.is_some(),
        "saved notification must remain saved"
    );

    let expired =
        list_notifications(&fixture.service, fixture.recipients[1]).await?;
    ensure!(
        expired.is_empty(),
        "unsaved notification copy must be removed"
    );

    Ok(())
}
