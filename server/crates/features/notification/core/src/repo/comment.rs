use chrono::{DateTime, FixedOffset};
use entity::{
    comment_thread_notification, notification, notification_entry,
    notification_event,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, EntityTrait, JoinType,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, TryInsert,
    TryInsertResult,
};
use sea_query::{Expr, OnConflict, Query};
use sorted_vec::SortedSet;

use super::delivery::{
    CreateNotificationsCommand, LockedNotification, NotificationRecipients,
    ReservedInboxPosition, create_notification, deliver_event_at_positions,
    lock_notification,
};
use super::event::NotificationEventId;
use crate::{NotificationAggregateKind, Seq};

pub(super) async fn create_comment_notifications(
    conn: &DatabaseTransaction,
    command: &CreateNotificationsCommand,
    thread_recipients: &[i32],
    thread_id: i32,
    comment_id: i32,
    reply_recipient_id: Option<i32>,
) -> Result<NotificationRecipients, DatabaseError> {
    let thread_recipients =
        SortedSet::from_unsorted(thread_recipients.to_vec());
    let mut inbox_recipients = thread_recipients.clone();
    if let Some(recipient_id) = reply_recipient_id {
        inbox_recipients.find_or_insert(recipient_id);
    }

    if inbox_recipients.is_empty() {
        return Ok(NotificationRecipients::default());
    }

    let Some(event) = command.create_event(conn).await? else {
        return Ok(NotificationRecipients::default());
    };

    for &recipient_id in &inbox_recipients {
        if reply_recipient_id == Some(recipient_id) {
            let position =
                ReservedInboxPosition::reserve(conn, recipient_id).await?;
            deliver_event_at_positions(
                conn,
                event,
                NotificationAggregateKind::CommentReplied,
                vec![position],
            )
            .await?;
        }

        if thread_recipients.binary_search(&recipient_id).is_ok() {
            let position =
                ReservedInboxPosition::reserve(conn, recipient_id).await?;
            deliver_comment_thread_update(
                conn, event, position, thread_id, comment_id,
            )
            .await?;
        }
    }

    Ok(NotificationRecipients {
        user_ids: inbox_recipients,
    })
}

async fn deliver_comment_thread_update(
    conn: &DatabaseTransaction,
    event_id: NotificationEventId,
    position: ReservedInboxPosition,
    thread_id: i32,
    comment_id: i32,
) -> Result<(), DatabaseError> {
    let notification = lock_or_create_comment_thread_notification(
        conn,
        position.recipient_id,
        thread_id,
    )
    .await?;

    append_comment_thread_event(
        conn,
        &notification,
        position,
        event_id,
        comment_id,
    )
    .await
}

/// Locking its parent row serializes sequence allocation with other appends and retention.
/// Concurrent first deliveries race on the typed identity; the loser removes its unreferenced parent and retries.
async fn lock_or_create_comment_thread_notification(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    thread_id: i32,
) -> Result<LockedNotification, DatabaseError> {
    loop {
        if let Some(existing) = comment_thread_notification::Entity::find()
            .filter(
                comment_thread_notification::Column::RecipientId
                    .eq(recipient_id),
            )
            .filter(
                comment_thread_notification::Column::CommentThreadId
                    .eq(thread_id),
            )
            .one(conn)
            .await
            .db_operation("find comment thread notification")?
        {
            if let Some(notification) = lock_notification(
                conn,
                existing.notification_id,
                recipient_id,
                NotificationAggregateKind::CommentThreadUpdated,
            )
            .await?
            {
                return Ok(notification);
            }

            // Retention can remove the parent between the identity lookup and the row lock.
            continue;
        }

        let notification_id = create_notification(
            conn,
            recipient_id,
            NotificationAggregateKind::CommentThreadUpdated,
        )
        .await?;

        let inserted =
            TryInsert::one(comment_thread_notification::ActiveModel {
                notification_id: Set(notification_id),
                recipient_id: Set(recipient_id),
                comment_thread_id: Set(Some(thread_id)),
            })
            .on_conflict(
                OnConflict::columns([
                    comment_thread_notification::Column::RecipientId,
                    comment_thread_notification::Column::CommentThreadId,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec(conn)
            .await
            .db_operation("insert comment thread notification identity")?;

        match inserted {
            TryInsertResult::Inserted(_) => {
                return lock_notification(
                    conn,
                    notification_id,
                    recipient_id,
                    NotificationAggregateKind::CommentThreadUpdated,
                )
                .await?
                .ok_or_else(|| {
                    DatabaseError::internal(
                        "new comment thread notification is missing",
                    )
                });
            }
            TryInsertResult::Conflicted => {
                notification::Entity::delete_by_id(notification_id)
                    .exec(conn)
                    .await
                    .db_operation(
                        "delete conflicted comment thread notification parent",
                    )?;
            }
            TryInsertResult::Empty => {
                unreachable!("TryInsert::one returned Empty")
            }
        }
    }
}

async fn append_comment_thread_event(
    conn: &DatabaseTransaction,
    notification: &LockedNotification,
    position: ReservedInboxPosition,
    event_id: NotificationEventId,
    comment_id: i32,
) -> Result<(), DatabaseError> {
    let next_seq = notification.last_seq.checked_add(1).ok_or_else(|| {
        DatabaseError::internal("comment thread notification sequence overflow")
    })?;
    let event_id: i64 = event_id.into();
    let query = Query::insert()
        .into_table(notification_entry::Entity)
        .columns([
            notification_entry::Column::NotificationId,
            notification_entry::Column::RecipientId,
            notification_entry::Column::EventId,
            notification_entry::Column::Seq,
            notification_entry::Column::InboxSeq,
            notification_entry::Column::CreatedAt,
        ])
        .values_panic([
            Expr::value(notification.id),
            Expr::value(position.recipient_id),
            Expr::value(event_id),
            Expr::value(next_seq),
            Expr::value(position.inbox_seq),
            Expr::cust_with_values(
                "GREATEST(clock_timestamp(), $1)",
                [notification.last_activity_at],
            ),
        ])
        .on_conflict(
            OnConflict::columns([
                notification_entry::Column::NotificationId,
                notification_entry::Column::EventId,
            ])
            .do_nothing()
            .to_owned(),
        )
        .returning_col(notification_entry::Column::CreatedAt)
        .to_owned();
    let Some(inserted) = conn
        .query_one(conn.get_database_backend().build(&query))
        .await
        .db_operation("append comment thread notification entry")?
    else {
        return Ok(());
    };
    let append_at: DateTime<FixedOffset> =
        inserted
            .try_get("", "created_at")
            .db_operation("decode comment thread notification append time")?;

    if notification.last_seq > 0 {
        let previous_comment_id = notification_entry::Entity::find()
            .select_only()
            .column(notification_event::Column::CommentId)
            .join(
                JoinType::InnerJoin,
                notification_entry::Relation::NotificationEvent.def(),
            )
            .filter(
                notification_entry::Column::NotificationId.eq(notification.id),
            )
            .filter(notification_entry::Column::Seq.eq(notification.last_seq))
            .into_tuple::<Option<i32>>()
            .one(conn)
            .await
            .db_operation("load previous comment thread notification entry")?
            .flatten()
            .ok_or_else(|| {
                DatabaseError::internal(
                    "comment thread notification has no latest comment",
                )
            })?;

        if comment_id <= previous_comment_id {
            return Err(DatabaseError::internal(
                "comment thread notifications must follow comment order",
            ));
        }
    }

    let updated = notification::Entity::update_many()
        .col_expr(notification::Column::LastSeq, Expr::value(next_seq))
        .col_expr(notification::Column::LastActivityAt, Expr::value(append_at))
        .filter(notification::Column::Id.eq(notification.id))
        .filter(notification::Column::LastSeq.eq(notification.last_seq))
        .exec(conn)
        .await
        .db_operation("advance comment thread notification")?;

    if updated.rows_affected != 1 {
        return Err(DatabaseError::internal(
            "locked comment thread notification changed during append",
        ));
    }

    Ok(())
}

pub async fn mark_comment_thread_read_through(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    thread_id: i32,
    through_comment_id: i32,
) -> Result<bool, DatabaseError> {
    let boundary = notification_entry::Entity::find()
        .select_only()
        .column(notification_entry::Column::NotificationId)
        .column(notification_entry::Column::Seq)
        .inner_join(notification::Entity)
        .inner_join(notification_event::Entity)
        .join(
            JoinType::InnerJoin,
            notification::Relation::CommentThreadNotification.def(),
        )
        .filter(sea_query::all![
            notification::Column::RecipientId.eq(recipient_id),
            notification::Column::Kind
                .eq(NotificationAggregateKind::CommentThreadUpdated),
            comment_thread_notification::Column::CommentThreadId.eq(thread_id),
            notification_event::Column::CommentThreadId.eq(thread_id),
            notification_event::Column::CommentId.lte(through_comment_id),
        ])
        .order_by_desc(notification_entry::Column::Seq)
        .into_tuple::<(Uuid, i64)>()
        .one(conn)
        .await
        .db_operation("load comment thread read boundary")?;

    let Some((notification_id, seq)) = boundary else {
        return Ok(false);
    };
    let seq = Seq::new(seq).ok_or_else(|| {
        DatabaseError::internal(
            "comment thread read boundary has a non-positive sequence",
        )
    })?;

    super::mark_notification_read_through_unchecked(
        conn,
        recipient_id,
        notification_id,
        seq,
    )
    .await
}
