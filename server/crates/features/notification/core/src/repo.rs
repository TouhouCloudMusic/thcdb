mod comment;
mod delivery;
mod event;

pub use comment::mark_comment_thread_read_through;
pub use delivery::{
    CreateNotificationsCommand, NotificationRecipients, create_notifications,
};
use entity::notification;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, EntityTrait,
    QueryFilter, QuerySelect,
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
pub async fn mark_notification_read_through(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    notification_id: Uuid,
    through_seq: Seq,
) -> Result<ReadStateUpdateStatus, DatabaseError> {
    let through_seq = i64::from(through_seq);

    let Some(notification) = notification::Entity::find_by_id(notification_id)
        .filter(notification::Column::RecipientId.eq(recipient_id))
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("load notification read boundary")?
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

pub async fn mark_notification_unread_from(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    notification_id: Uuid,
    seq: Seq,
) -> Result<ReadStateUpdateStatus, DatabaseError> {
    let seq = i64::from(seq);

    let Some(notification) = notification::Entity::find_by_id(notification_id)
        .filter(notification::Column::RecipientId.eq(recipient_id))
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("load notification unread boundary")?
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
        .db_operation("move notification read state backward")?;

    if result.rows_affected == 0 {
        Ok(ReadStateUpdateStatus::NotificationNotFound)
    } else {
        Ok(ReadStateUpdateStatus::Ok)
    }
}

/// Marks a server-resolved boundary without returning request-validation status.
/// A boundary that no longer matches a notification is a no-op.
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

async fn update_notification_read_through(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
    through_seq: i64,
) -> Result<u64, DatabaseError> {
    notification::Entity::update_many()
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
        .await
        .db_operation("advance notification read state")
        .map(|result| result.rows_affected)
}
