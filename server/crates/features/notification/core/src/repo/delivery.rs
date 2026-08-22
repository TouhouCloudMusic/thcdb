use std::collections::{BTreeSet, HashMap, HashSet};

use chrono::{DateTime, FixedOffset};
use entity::enums::NotificationAggregateKind as DbNotificationAggregateKind;
use entity::{
    notification, notification_entry, notification_event,
    notification_inbox_state,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::Set;
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, DatabaseTransaction, EntityTrait, JoinType, QueryFilter,
    QuerySelect, RelationTrait, TryInsert,
};
use sea_query::{Condition, Expr, OnConflict};
use sorted_vec::SortedSet;

use super::comment::create_comment_notifications;
use super::event::NotificationEventId;
use crate::event::{
    DeliveryCooldown, DeliveryCooldownScope, NotificationEventReferences,
};
use crate::{
    CorrectionModerationAction, ImageQueueModerationAction,
    NotificationAggregateKind,
};

#[derive(Debug, Default)]
#[must_use]
pub struct NotificationRecipients {
    pub user_ids: SortedSet<i32>,
}

pub enum CreateNotificationsCommand {
    CorrectionReviewRequested {
        actor_id: i32,
        recipients: Vec<i32>,
        correction_id: i32,
    },
    CorrectionUpdated {
        actor_id: i32,
        recipients: Vec<i32>,
        correction_id: i32,
        entity_history_id: i32,
    },
    CorrectionModerated {
        actor_id: i32,
        recipients: Vec<i32>,
        correction_id: i32,
        action: CorrectionModerationAction,
    },
    CommentCreated {
        actor_id: i32,
        thread_recipients: Vec<i32>,
        thread_id: i32,
        comment_id: i32,
        content: String,
        occurred_at: DateTime<FixedOffset>,
        reply_recipient_id: Option<i32>,
    },
    UserFollowed {
        actor_id: i32,
        target_user_id: i32,
    },
    CollectionFollowed {
        actor_id: i32,
        recipient_id: i32,
        collection_id: i32,
    },
    CollectionItemAdded {
        actor_id: i32,
        recipients: Vec<i32>,
        collection_id: i32,
        item_id: i32,
    },
    ImageQueueModerated {
        actor_id: i32,
        recipients: Vec<i32>,
        image_queue_id: i32,
        action: ImageQueueModerationAction,
    },
    AccountRoleChanged {
        actor_id: i32,
        target_user_id: i32,
        new_roles: BTreeSet<i32>,
    },
}

pub(super) struct ReservedInboxPosition {
    pub(super) recipient_id: i32,
    pub(super) inbox_seq: i64,
}

impl ReservedInboxPosition {
    pub(super) async fn reserve(
        conn: &DatabaseTransaction,
        recipient_id: i32,
    ) -> Result<Self, DatabaseError> {
        let state = notification_inbox_state::Entity::insert(
            notification_inbox_state::ActiveModel {
                recipient_id: Set(recipient_id),
                last_inbox_seq: Set(1),
            },
        )
        .on_conflict(
            OnConflict::column(notification_inbox_state::Column::RecipientId)
                .value(
                    notification_inbox_state::Column::LastInboxSeq,
                    Expr::col((
                        notification_inbox_state::Entity,
                        notification_inbox_state::Column::LastInboxSeq,
                    ))
                    .add(1),
                )
                .to_owned(),
        )
        .exec_with_returning(conn)
        .await
        .db_operation("reserve notification Inbox position")?;

        Ok(Self {
            recipient_id,
            inbox_seq: state.last_inbox_seq,
        })
    }
}

pub(super) struct LockedNotification {
    pub(super) id: Uuid,
    pub(super) last_seq: i64,
    pub(super) last_activity_at: DateTime<FixedOffset>,
}

pub(super) async fn create_notification(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    kind: NotificationAggregateKind,
) -> Result<Uuid, DatabaseError> {
    notification::Entity::insert(notification::ActiveModel {
        recipient_id: Set(recipient_id),
        kind: Set(DbNotificationAggregateKind::from(kind)),
        ..Default::default()
    })
    .exec(conn)
    .await
    .db_operation("insert notification")
    .map(|result| result.last_insert_id)
}

pub(super) async fn lock_notification(
    conn: &DatabaseTransaction,
    notification_id: Uuid,
    recipient_id: i32,
    kind: NotificationAggregateKind,
) -> Result<Option<LockedNotification>, DatabaseError> {
    notification::Entity::find_by_id(notification_id)
        .filter(notification::Column::RecipientId.eq(recipient_id))
        .filter(notification::Column::Kind.eq(kind))
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock notification")
        .map(|notification| {
            notification.map(|model| LockedNotification {
                id: model.id,
                last_seq: model.last_seq,
                last_activity_at: model.last_activity_at,
            })
        })
}

/// Serializes cooldown decisions for one recipient without consuming an Inbox position.
async fn lock_inbox_state(
    conn: &DatabaseTransaction,
    recipient_id: i32,
) -> Result<(), DatabaseError> {
    TryInsert::one(notification_inbox_state::ActiveModel {
        recipient_id: Set(recipient_id),
        last_inbox_seq: Set(0),
    })
    .on_conflict(
        OnConflict::column(notification_inbox_state::Column::RecipientId)
            .do_nothing()
            .to_owned(),
    )
    .exec(conn)
    .await
    .db_operation("ensure notification Inbox state")?;

    notification_inbox_state::Entity::find_by_id(recipient_id)
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock notification Inbox state")?
        .ok_or_else(|| {
            DatabaseError::internal("notification Inbox state is missing")
        })?;

    Ok(())
}

pub async fn create_notifications(
    conn: &DatabaseTransaction,
    command: CreateNotificationsCommand,
) -> Result<NotificationRecipients, DatabaseError> {
    use CreateNotificationsCommand as Command;
    use NotificationAggregateKind as Aggregate;

    let (kind, recipients): (NotificationAggregateKind, &[i32]) = match &command
    {
        Command::CorrectionReviewRequested { recipients, .. } => {
            (Aggregate::CorrectionReviewRequested, recipients)
        }
        Command::CorrectionUpdated { recipients, .. } => {
            (Aggregate::CorrectionUpdated, recipients)
        }
        Command::CorrectionModerated { recipients, .. } => {
            (Aggregate::CorrectionModerated, recipients)
        }
        Command::CommentCreated {
            thread_recipients,
            thread_id,
            comment_id,
            reply_recipient_id,
            ..
        } => {
            return create_comment_notifications(
                conn,
                &command,
                thread_recipients,
                *thread_id,
                *comment_id,
                *reply_recipient_id,
            )
            .await;
        }
        Command::UserFollowed { target_user_id, .. } => (
            Aggregate::UserFollowed,
            std::slice::from_ref(target_user_id),
        ),
        Command::CollectionFollowed { recipient_id, .. } => (
            Aggregate::CollectionFollowed,
            std::slice::from_ref(recipient_id),
        ),
        Command::CollectionItemAdded { recipients, .. } => {
            (Aggregate::CollectionItemAdded, recipients)
        }
        Command::ImageQueueModerated { recipients, .. } => {
            (Aggregate::ImageQueueModerated, recipients)
        }
        Command::AccountRoleChanged { target_user_id, .. } => (
            Aggregate::AccountRoleChanged,
            std::slice::from_ref(target_user_id),
        ),
    };

    create_single_event_notifications(conn, &command, kind, recipients).await
}

async fn create_single_event_notifications(
    conn: &DatabaseTransaction,
    command: &CreateNotificationsCommand,
    kind: NotificationAggregateKind,
    recipients: &[i32],
) -> Result<NotificationRecipients, DatabaseError> {
    let recipients = SortedSet::from_unsorted(recipients.to_vec());
    let recipients =
        apply_delivery_cooldown(conn, recipients, kind, command).await?;

    if recipients.is_empty() {
        return Ok(NotificationRecipients {
            user_ids: recipients,
        });
    }

    let Some(event) = command.create_event(conn).await? else {
        return Ok(NotificationRecipients::default());
    };

    let mut positions = Vec::with_capacity(recipients.len());
    for &recipient_id in &recipients {
        positions
            .push(ReservedInboxPosition::reserve(conn, recipient_id).await?);
    }

    deliver_event_at_positions(conn, event, kind, positions).await?;

    Ok(NotificationRecipients {
        user_ids: recipients,
    })
}

pub(super) async fn deliver_event_at_positions(
    conn: &DatabaseTransaction,
    event_id: NotificationEventId,
    kind: NotificationAggregateKind,
    positions: Vec<ReservedInboxPosition>,
) -> Result<(), DatabaseError> {
    let models = positions.iter().map(|position| notification::ActiveModel {
        recipient_id: Set(position.recipient_id),
        kind: Set(DbNotificationAggregateKind::from(kind)),
        last_seq: Set(1),
        ..Default::default()
    });
    let notifications = notification::Entity::insert_many(models)
        .exec_with_returning_many(conn)
        .await
        .db_operation("insert recipient notifications")?;

    let inbox_sequences = positions
        .into_iter()
        .map(|position| (position.recipient_id, position.inbox_seq))
        .collect::<HashMap<_, _>>();

    let entries = notifications.iter().map(|notification| {
        let inbox_seq = inbox_sequences
            .get(&notification.recipient_id)
            .copied()
            .expect("created notification recipient has a reserved position");
        notification_entry::ActiveModel {
            notification_id: Set(notification.id),
            recipient_id: Set(notification.recipient_id),
            event_id: Set(event_id.into()),
            seq: Set(1),
            inbox_seq: Set(inbox_seq),
            created_at: Set(notification.last_activity_at),
        }
    });

    notification_entry::Entity::insert_many(entries)
        .exec_without_returning(conn)
        .await
        .db_operation("insert initial notification entries")?;

    Ok(())
}

fn event_references_filter(
    references: NotificationEventReferences,
) -> Condition {
    match references {
        NotificationEventReferences::Correction(id) => Condition::all()
            .add(notification_event::Column::CorrectionId.eq(id)),
        NotificationEventReferences::ImageQueue(id) => Condition::all()
            .add(notification_event::Column::ImageQueueId.eq(id)),
        NotificationEventReferences::Comment {
            thread_id,
            comment_id,
        } => Condition::all()
            .add(notification_event::Column::CommentThreadId.eq(thread_id))
            .add(notification_event::Column::CommentId.eq(comment_id)),
        NotificationEventReferences::User(id) => Condition::all()
            .add(notification_event::Column::TargetUserId.eq(id)),
        NotificationEventReferences::UserCollection(id) => Condition::all()
            .add(notification_event::Column::UserCollectionId.eq(id)),
    }
}

fn delivery_cooldown_filter(
    command: &CreateNotificationsCommand,
    scope: enumset::EnumSet<DeliveryCooldownScope>,
) -> Condition {
    let mut filter = Condition::all();
    if scope.contains(DeliveryCooldownScope::Actor) {
        filter = filter
            .add(notification_event::Column::ActorId.eq(command.actor_id()));
    }
    if scope.contains(DeliveryCooldownScope::References) {
        filter = filter.add(event_references_filter(command.references()));
    }
    filter
}

async fn apply_delivery_cooldown(
    conn: &DatabaseTransaction,
    mut recipients: SortedSet<i32>,
    kind: NotificationAggregateKind,
    command: &CreateNotificationsCommand,
) -> Result<SortedSet<i32>, DatabaseError> {
    if recipients.is_empty() {
        return Ok(recipients);
    }

    let Some(DeliveryCooldown { duration, scope }) = kind.delivery_cooldown()
    else {
        return Ok(recipients);
    };

    for &recipient_id in &recipients {
        lock_inbox_state(conn, recipient_id).await?;
    }

    let cooldown_seconds = duration.as_secs_f64();

    let recent_recipients = notification_entry::Entity::find()
        .select_only()
        .column(notification::Column::RecipientId)
        .join(
            JoinType::InnerJoin,
            notification_entry::Relation::Notification.def(),
        )
        .join(
            JoinType::InnerJoin,
            notification_entry::Relation::NotificationEvent.def(),
        )
        .filter(
            notification::Column::RecipientId.is_in(recipients.iter().copied()),
        )
        .filter(notification::Column::Kind.eq(kind))
        .filter(delivery_cooldown_filter(command, scope))
        .filter(
            Expr::col((
                notification_entry::Entity,
                notification_entry::Column::CreatedAt,
            ))
            .gt(Expr::cust_with_values(
                "statement_timestamp() - make_interval(secs => $1)",
                [cooldown_seconds],
            ))
            .and(
                Expr::col((
                    notification_entry::Entity,
                    notification_entry::Column::CreatedAt,
                ))
                .lte(Expr::cust("statement_timestamp()")),
            ),
        )
        .distinct()
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("load notification cooldown recipients")?
        .into_iter()
        .collect::<HashSet<_>>();
    recipients.retain(|recipient| !recent_recipients.contains(recipient));
    Ok(recipients)
}
