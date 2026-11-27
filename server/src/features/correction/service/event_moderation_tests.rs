use std::time::Duration;

use anyhow::{Context, Result};
use entity::enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, DatePrecision,
    EntityType, NotificationEventType,
};
use entity::{correction, correction_user, event_history, notification_event};
use event_repo::write::NewEvent;
use infra_db::{DatabaseConnection, SeaOrmRepository, SeaOrmTxRepo};
use infra_testing::MockUser;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    Statement,
};
use serde_json::json;
use tokio::sync::broadcast::error::TryRecvError;
use tokio::time::{sleep, timeout};

use super::{CorrectionUpsertMode, ModerationError, approve, repo};
use crate::features::correction::{NewCorrection, NewCorrectionMeta};
use crate::features::event::service::Service;
use crate::features::user::User;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::integration_test::test_connection;

struct PendingEventCorrection {
    repo: SeaOrmRepository,
    event_id: i32,
    correction_id: i32,
    author: User,
    approver: User,
}

impl PendingEventCorrection {
    async fn new() -> Result<Self> {
        let conn = test_connection().await?;
        let author: User = MockUser::with_label("event_author")
            .insert(&conn)
            .await?
            .into();
        let approver = MockUser::with_label("event_approver")
            .insert(&conn)
            .await?
            .into();
        let repo = SeaOrmRepository::new(conn);
        let service = Service::new(repo.clone(), UserEventSender::new(1));
        let event_id = service
            .create(NewCorrection {
                data: serde_json::from_value(json!({
                    "name": "Original event",
                    "alternative_names": ["Original alias"],
                    "links": ["https://example.com/original"],
                }))?,
                author: author.clone(),
                description: String::new(),
                r#type: CorrectionType::Create,
            })
            .await?
            .entity_id;
        let correction_id = service
            .upsert_correction(
                event_id,
                NewCorrection {
                    data: serde_json::from_value(json!({
                        "name": "Proposed event",
                        "alternative_names": ["New alias"],
                        "links": ["https://example.com/proposed"],
                    }))?,
                    author: author.clone(),
                    description: String::new(),
                    r#type: CorrectionType::Update,
                },
                CorrectionUpsertMode::Create,
            )
            .await?
            .submitted_id()
            .context("the update should become a pending correction")?;
        Ok(Self {
            repo,
            event_id,
            correction_id,
            author,
            approver,
        })
    }

    async fn lock_for_revision(&self) -> Result<SeaOrmTxRepo> {
        let tx = self.repo.begin_tx().await?;
        let correction = repo::lock_pending_correction(
            &tx,
            self.event_id,
            EntityType::Event,
        )
        .await?
        .context("the event should have a pending correction")?;
        assert_eq!(correction.id, self.correction_id);
        Ok(tx)
    }

    async fn append_revision(
        &self,
        tx: &SeaOrmTxRepo,
        history_id: i32,
    ) -> Result<()> {
        repo::update(
            tx,
            self.correction_id,
            NewCorrectionMeta::<NewEvent> {
                author: self.author.clone(),
                r#type: CorrectionType::Update,
                entity_id: self.event_id,
                history_id,
                description: String::new(),
                phantom: std::marker::PhantomData,
            },
        )
        .await?;
        Ok(())
    }
}

#[tokio::test]
async fn approval_applies_event_history_and_notifies_the_author() -> Result<()>
{
    let pending = PendingEventCorrection::new().await?;
    let events = UserEventSender::new(1);
    let mut inbox = events.subscribe();
    approve(
        &pending.repo,
        events,
        pending.correction_id,
        pending.approver.clone(),
    )
    .await?;

    let conn = &pending.repo.conn;
    let event = event_repo::find_by_id(conn, pending.event_id)
        .await?
        .context("the approved event should exist")?;
    assert_eq!(event.name, "Proposed event");
    assert_eq!(event.alternative_names.len(), 1);
    assert_eq!(event.alternative_names[0].name, "New alias");
    assert_eq!(event.links, ["https://example.com/proposed"]);
    let correction = correction::Entity::find_by_id(pending.correction_id)
        .one(conn)
        .await?
        .context("the approved correction should exist")?;
    assert_eq!(correction.status, CorrectionStatus::Approved);
    assert!(correction.handled_at.is_some());
    let notice = notification_event::Entity::find()
        .filter(
            notification_event::Column::CorrectionId.eq(pending.correction_id),
        )
        .filter(
            notification_event::Column::EventType
                .eq(NotificationEventType::CorrectionApproved),
        )
        .one(conn)
        .await?
        .context("the approval notification should be committed")?;
    assert_eq!(notice.actor_id, pending.approver.id);
    let message = inbox.try_recv()?;
    assert_eq!(message.event, UserEvent::NotificationInboxUpdated);
    assert!(message.is_for(pending.author.id));
    Ok(())
}

#[tokio::test]
async fn approval_with_missing_event_history_leaves_the_correction_pending()
-> Result<()> {
    let pending = PendingEventCorrection::new().await?;
    let tx = pending.lock_for_revision().await?;
    pending.append_revision(&tx, i32::MAX).await?;
    tx.commit().await?;

    let events = UserEventSender::new(1);
    let mut inbox = events.subscribe();
    let error = approve(
        &pending.repo,
        events.clone(),
        pending.correction_id,
        pending.approver,
    )
    .await
    .err()
    .context("approval must fail if the event history is missing")?;
    assert!(matches!(error, ModerationError::Database(_)));

    let conn = &pending.repo.conn;
    let correction = correction::Entity::find_by_id(pending.correction_id)
        .one(conn)
        .await?
        .context("the failed correction should still exist")?;
    assert_eq!(correction.status, CorrectionStatus::Pending);
    assert!(correction.handled_at.is_none());
    let approvers = correction_user::Entity::find()
        .filter(correction_user::Column::CorrectionId.eq(pending.correction_id))
        .filter(
            correction_user::Column::UserType.eq(CorrectionUserType::Approver),
        )
        .count(conn)
        .await?;
    assert_eq!(approvers, 0);
    let event = event_repo::find_by_id(conn, pending.event_id)
        .await?
        .context("the published event should still exist")?;
    assert_eq!(event.name, "Original event");
    let notices = notification_event::Entity::find()
        .filter(
            notification_event::Column::CorrectionId.eq(pending.correction_id),
        )
        .filter(
            notification_event::Column::EventType
                .eq(NotificationEventType::CorrectionApproved),
        )
        .count(conn)
        .await?;
    assert_eq!(notices, 0);
    assert!(matches!(inbox.try_recv(), Err(TryRecvError::Empty)));
    Ok(())
}

async fn wait_for_waiter(
    conn: &DatabaseConnection,
    blocking_pid: i32,
) -> Result<()> {
    // Observe PostgreSQL's lock wait before committing the competing revision.
    let statement = Statement::from_sql_and_values(
        conn.get_database_backend(),
        "SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid)) LIMIT 1",
        [blocking_pid.into()],
    );
    while conn.query_one(statement.clone()).await?.is_none() {
        sleep(Duration::from_millis(10)).await;
    }
    Ok(())
}

#[tokio::test]
async fn approval_includes_a_concurrently_committed_event_revision()
-> Result<()> {
    let pending = PendingEventCorrection::new().await?;
    let submission = pending.lock_for_revision().await?;
    let tx = submission.conn();
    let conn = &pending.repo.conn;
    let pid = tx
        .query_one(Statement::from_string(
            tx.get_database_backend(),
            "SELECT pg_backend_pid()",
        ))
        .await?
        .context("the revision transaction should have a backend PID")?
        .try_get_by_index(0)?;
    let save_revision = async {
        wait_for_waiter(conn, pid).await?;
        let history_id =
            event_history::Entity::insert(event_history::ActiveModel {
                name: Set("Concurrent revision".into()),
                short_description: Set(String::new()),
                description: Set(String::new()),
                start_date_precision: Set(DatePrecision::Day),
                end_date_precision: Set(DatePrecision::Day),
                ..Default::default()
            })
            .exec(submission.conn())
            .await?
            .last_insert_id;
        pending.append_revision(&submission, history_id).await?;
        submission.commit().await?;
        Ok::<_, anyhow::Error>(())
    };

    let (approved, saved) = timeout(Duration::from_secs(10), async {
        tokio::join!(
            approve(
                &pending.repo,
                UserEventSender::new(1),
                pending.correction_id,
                pending.approver.clone()
            ),
            save_revision,
        )
    })
    .await
    .context(
        "approval should wait for the revision transaction and then complete",
    )?;
    saved?;
    approved?;
    let event = event_repo::find_by_id(conn, pending.event_id)
        .await?
        .context("the approved event should exist")?;
    assert_eq!(event.name, "Concurrent revision");
    Ok(())
}
