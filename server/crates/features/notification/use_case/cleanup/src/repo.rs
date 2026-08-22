use std::num::NonZeroU16;
use std::ops::AddAssign;

use chrono::{DateTime, FixedOffset};
use entity::{notification, notification_entry, notification_event};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseConnection, DatabaseTransaction,
    DbErr, EntityTrait, FromQueryResult, QueryFilter, QueryOrder, QuerySelect,
    QueryTrait, TransactionTrait,
};
use sea_query::{
    Alias, Condition, Expr, ExprTrait, LockBehavior, LockType, Query, all,
};

mod expired_entries;

#[derive(FromQueryResult)]
struct LockedNotification {
    id: Uuid,
    last_seq: i64,
    purged_through_seq: i64,
}

#[derive(Default)]
pub(super) struct CleanupCounts {
    pub(super) notifications: u64,
    pub(super) entries: u64,
    pub(super) notification_events: u64,
}

impl CleanupCounts {
    pub(super) const fn is_empty(&self) -> bool {
        self.notifications == 0
            && self.entries == 0
            && self.notification_events == 0
    }
}

impl AddAssign for CleanupCounts {
    fn add_assign(&mut self, rhs: Self) {
        self.notifications += rhs.notifications;
        self.entries += rhs.entries;
        self.notification_events += rhs.notification_events;
    }
}

pub(super) async fn load_retention_cutoff(
    conn: &impl ConnectionTrait,
    retention_days: NonZeroU16,
) -> Result<DateTime<FixedOffset>, DbErr> {
    const RETENTION_CUTOFF: &str = "notification_retention_cutoff";

    let query = Query::select()
        .expr_as(
            Expr::cust_with_values(
                "clock_timestamp() - make_interval(days => $1)",
                [i32::from(retention_days.get())],
            ),
            Alias::new(RETENTION_CUTOFF),
        )
        .to_owned();
    let row = conn
        .query_one(conn.get_database_backend().build(&query))
        .await?
        .ok_or_else(|| {
            DbErr::RecordNotFound(
                "notification retention cutoff returned no row".to_string(),
            )
        })?;

    row.try_get("", RETENTION_CUTOFF)
}

async fn lock_expired_notifications(
    tx: &DatabaseTransaction,
    cutoff: DateTime<FixedOffset>,
    notification_limit: u64,
    entry_limit: u64,
) -> Result<Vec<LockedNotification>, DbErr> {
    lock_cleanup_candidates(
        tx,
        all![
            notification::Column::SavedAt.is_null(),
            notification::Column::LastActivityAt.lt(cutoff),
            Expr::col(notification::Column::LastSeq)
                .sub(Expr::col(notification::Column::PurgedThroughSeq))
                .lte(entry_limit),
        ],
        notification_limit,
    )
    .await
}

async fn lock_notifications_with_expired_entries(
    tx: &DatabaseTransaction,
    cutoff: DateTime<FixedOffset>,
    notification_limit: u64,
) -> Result<Vec<LockedNotification>, DbErr> {
    let expired_entries = notification_entry::Entity::find()
        .select_only()
        .expr(1)
        .filter(all![
            Expr::col((
                notification_entry::Entity,
                notification_entry::Column::NotificationId,
            ))
            .equals((notification::Entity, notification::Column::Id)),
            notification_entry::Column::CreatedAt.lt(cutoff),
            Expr::col((
                notification_entry::Entity,
                notification_entry::Column::Seq,
            ))
            .eq(Expr::col((
                notification::Entity,
                notification::Column::PurgedThroughSeq,
            ))
            .add(1)),
            Expr::col((
                notification_entry::Entity,
                notification_entry::Column::Seq,
            ))
            .lt(Expr::col((
                notification::Entity,
                notification::Column::LastSeq,
            ))),
        ])
        .into_query();

    lock_cleanup_candidates(
        tx,
        all![Expr::exists(expired_entries)],
        notification_limit,
    )
    .await
}

async fn lock_cleanup_candidates(
    tx: &DatabaseTransaction,
    filter: Condition,
    notification_limit: u64,
) -> Result<Vec<LockedNotification>, DbErr> {
    notification::Entity::find()
        .select_only()
        .columns([
            notification::Column::Id,
            notification::Column::LastSeq,
            notification::Column::PurgedThroughSeq,
        ])
        .filter(filter)
        .order_by_asc(notification::Column::RecipientId)
        .order_by_asc(notification::Column::Id)
        .limit(notification_limit)
        .lock_with_behavior(LockType::Update, LockBehavior::SkipLocked)
        .into_model::<LockedNotification>()
        .all(tx)
        .await
}

pub(super) async fn delete_expired_notification_batch(
    conn: &DatabaseConnection,
    cutoff: DateTime<FixedOffset>,
    notification_limit: u64,
    entry_limit: u64,
) -> Result<CleanupCounts, DbErr> {
    let tx = conn.begin().await?;
    let notifications = lock_expired_notifications(
        &tx,
        cutoff,
        notification_limit,
        entry_limit,
    )
    .await?;

    let mut notification_ids = Vec::new();
    let mut entry_count = 0_u64;
    for notification in notifications {
        let retained = u64::try_from(
            notification
                .last_seq
                .saturating_sub(notification.purged_through_seq),
        )
        .map_err(|_| {
            std::hint::cold_path();
            DbErr::Custom("invalid notification sequence".into())
        })?;
        if entry_count + retained > entry_limit {
            continue;
        }
        entry_count += retained;
        notification_ids.push(notification.id);
    }

    if notification_ids.is_empty() {
        tx.commit().await?;
        return Ok(CleanupCounts::default());
    }

    let deleted_entries =
        expired_entries::delete_for_notifications(&tx, &notification_ids)
            .await?;

    let deleted = notification::Entity::delete_many()
        .filter(
            notification::Column::Id.is_in(notification_ids.iter().copied()),
        )
        .exec(&tx)
        .await?;

    let counts =
        finish_cleanup_batch(&tx, deleted.rows_affected, deleted_entries)
            .await?;
    tx.commit().await?;

    Ok(counts)
}

pub(super) async fn purge_expired_entry_batch(
    conn: &DatabaseConnection,
    cutoff: DateTime<FixedOffset>,
    notification_limit: u64,
    entry_limit: u64,
) -> Result<CleanupCounts, DbErr> {
    let tx = conn.begin().await?;
    let notifications = lock_notifications_with_expired_entries(
        &tx,
        cutoff,
        notification_limit,
    )
    .await?;
    let deleted_entries = expired_entries::purge_expired_batch(
        &tx,
        &notifications,
        cutoff,
        entry_limit,
    )
    .await?;

    let counts = finish_cleanup_batch(&tx, 0, deleted_entries).await?;
    tx.commit().await?;

    Ok(counts)
}

async fn finish_cleanup_batch(
    tx: &DatabaseTransaction,
    deleted_notifications: u64,
    deleted_entries: expired_entries::DeletedEntryBatch,
) -> Result<CleanupCounts, DbErr> {
    let notification_events =
        delete_orphaned_events(tx, &deleted_entries.event_ids).await?;

    Ok(CleanupCounts {
        notifications: deleted_notifications,
        entries: deleted_entries.count,
        notification_events,
    })
}

async fn delete_orphaned_events(
    tx: &DatabaseTransaction,
    event_ids: &[i64],
) -> Result<u64, DbErr> {
    if event_ids.is_empty() {
        return Ok(0);
    }

    let locked_ids = notification_event::Entity::find()
        .select_only()
        .column(notification_event::Column::Id)
        .filter(notification_event::Column::Id.is_in(event_ids.iter().copied()))
        .order_by_asc(notification_event::Column::Id)
        .lock_exclusive()
        .into_tuple::<i64>()
        .all(tx)
        .await?;

    if locked_ids.is_empty() {
        return Ok(0);
    }

    let referenced_events = notification_entry::Entity::find()
        .select_only()
        .column(notification_entry::Column::EventId)
        .filter(
            notification_entry::Column::EventId
                .is_in(locked_ids.iter().copied()),
        )
        .into_query();

    notification_event::Entity::delete_many()
        .filter(all![
            notification_event::Column::Id.is_in(locked_ids),
            notification_event::Column::Id.not_in_subquery(referenced_events),
        ])
        .exec(tx)
        .await
        .map(|result| result.rows_affected)
}
