mod comment;
mod delivery;
mod event;

pub use comment::mark_comment_thread_read_through;
pub use delivery::{
    CreateNotificationsCommand, NotificationRecipients, create_notifications,
};
use entity::notification;
use infra_db::DatabaseTransaction;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};
use sea_query::{Expr, Func, all};

use crate::Seq;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[must_use]
pub enum ReadStateUpdateStatus {
    Ok,
    NotificationNotFound,
    InvalidBoundary,
}

/// Advances the recipient's read boundary without moving it backward.
#[infra_db::observe("notification.mark_read_through")]
pub async fn mark_notification_read_through(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    notification_id: Uuid,
    through_seq: Seq,
) -> Result<ReadStateUpdateStatus, DatabaseError> {
    let through_seq = i64::from(through_seq);

    let Some(notification) =
        load_notification_for_update(conn, recipient_id, notification_id)
            .await?
    else {
        return Ok(ReadStateUpdateStatus::NotificationNotFound);
    };
    if through_seq > notification.last_seq {
        return Ok(ReadStateUpdateStatus::InvalidBoundary);
    }

    update_notification_read_through(
        conn,
        recipient_id,
        notification_id,
        through_seq,
    )
    .await?;

    Ok(ReadStateUpdateStatus::Ok)
}

#[infra_db::observe("notification.mark_unread_from")]
pub async fn mark_notification_unread_from(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    notification_id: Uuid,
    seq: Seq,
) -> Result<ReadStateUpdateStatus, DatabaseError> {
    let seq = i64::from(seq);

    let Some(notification) =
        load_notification_for_update(conn, recipient_id, notification_id)
            .await?
    else {
        return Ok(ReadStateUpdateStatus::NotificationNotFound);
    };
    if seq > notification.last_seq || seq <= notification.purged_through_seq {
        return Ok(ReadStateUpdateStatus::InvalidBoundary);
    }

    let read_through_seq = notification.read_through_seq.min(seq - 1);
    let result = notification::Entity::update_many()
        .col_expr(
            notification::Column::ReadThroughSeq,
            Expr::value(read_through_seq),
        )
        .filter(notification::Column::Id.eq(notification_id))
        .filter(notification::Column::RecipientId.eq(recipient_id))
        .exec(conn)
        .await
        .db_context("move notification read state backward")?;

    if result.rows_affected == 0 {
        Ok(ReadStateUpdateStatus::NotificationNotFound)
    } else {
        Ok(ReadStateUpdateStatus::Ok)
    }
}

#[infra_db::observe("notification.lock_for_update")]
async fn load_notification_for_update(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    notification_id: Uuid,
) -> Result<Option<notification::Model>, DatabaseError> {
    let notification = notification::Entity::find_by_id(notification_id)
        .filter(notification::Column::RecipientId.eq(recipient_id))
        .lock_exclusive()
        .one(conn)
        .await?;
    Ok(notification)
}

/// Marks a server-resolved boundary without returning request-validation status.
/// A boundary that no longer matches a notification is a no-op.
#[infra_db::observe("notification.mark_read_through_unchecked")]
pub(super) async fn mark_notification_read_through_unchecked(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
    through_seq: Seq,
) -> Result<bool, DatabaseError> {
    let rows_affected = update_notification_read_through(
        conn,
        recipient_id,
        notification_id,
        i64::from(through_seq),
    )
    .await?;

    Ok(rows_affected != 0)
}

#[infra_db::observe("notification.update_read_through")]
async fn update_notification_read_through(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
    through_seq: i64,
) -> Result<u64, DatabaseError> {
    let result = notification::Entity::update_many()
        .col_expr(
            notification::Column::ReadThroughSeq,
            Expr::expr(Func::greatest([
                Expr::col(notification::Column::ReadThroughSeq).into(),
                Expr::value(through_seq),
            ]))
            .into(),
        )
        .filter(all![
            notification::Column::Id.eq(notification_id),
            notification::Column::RecipientId.eq(recipient_id),
            notification::Column::LastSeq.gte(through_seq),
            notification::Column::ReadThroughSeq.lt(through_seq),
        ])
        .exec(conn)
        .await?;
    Ok(result.rows_affected)
}
