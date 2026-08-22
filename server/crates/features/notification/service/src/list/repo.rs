use std::collections::{HashMap, HashSet};

use chrono::{DateTime, FixedOffset};
use entity::enums::{
    NotificationAggregateKind as DbNotificationAggregateKind,
    NotificationEventType as DbNotificationEventType,
};
use entity::{
    account_role_changed_notification_event,
    comment_created_notification_event, notification, notification_entry,
    notification_event, role,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use notification_core::{NotificationAggregateKind, NotificationCategory};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, EntityTrait, FromQueryResult,
    JoinType, Order, QueryFilter, QueryOrder, QuerySelect, RelationTrait,
};
use sea_query::{
    Alias, Expr, ExprTrait, Func, Query, SelectStatement, WindowStatement,
};

use crate::inbox::{InboxCutoff, unread_after_seq};
use crate::model::NotificationState;

const MAX_UNREAD_COMMENTER_COUNT: i64 = 100;
const MAX_DISPLAYED_COMMENTER_COUNT: i64 = 3;

/// Query for one notification batch within an Inbox snapshot.
pub(super) struct RawNotificationBatchQuery {
    pub(super) state: NotificationState,
    pub(super) category: Option<NotificationCategory>,
    pub(super) cutoff: InboxCutoff,
    pub(super) before_inbox_seq: Option<i64>,
    pub(super) limit: usize,
}

pub(super) struct RawNotificationBatch {
    pub(super) raw_notifications: Vec<RawNotification>,
    pub(super) next_before_inbox_seq: Option<i64>,
    pub(super) exhausted: bool,
}

pub(super) async fn load_raw_notification_batch(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    query: RawNotificationBatchQuery,
) -> Result<RawNotificationBatch, DatabaseError> {
    let limit = query.limit;
    let mut raw_notifications =
        list_snapshot_heads(conn, recipient_id, query).await?;
    load_notification_data(conn, &mut raw_notifications).await?;
    let next_before_inbox_seq = raw_notifications
        .last()
        .map(|notification| notification.listed.head_inbox_seq);
    let exhausted = raw_notifications.len() < limit;

    Ok(RawNotificationBatch {
        raw_notifications,
        next_before_inbox_seq,
        exhausted,
    })
}

/// Unread entry sequence interval `(after_seq, through_seq]` in the snapshot.
#[derive(Clone, Copy)]
struct UnreadEntryRange {
    after_seq: i64,
    through_seq: i64,
}

/// Notification metadata at the Inbox cutoff with current recipient state.
pub(super) struct ListedNotification {
    pub(super) id: Uuid,
    pub(super) kind: NotificationAggregateKind,
    /// Last event sequence visible at the Inbox cutoff.
    pub(super) through_seq: i64,
    /// Last Inbox position visible at the cutoff.
    pub(super) head_inbox_seq: i64,
    /// Last activity time visible at the cutoff.
    pub(super) last_activity_at: DateTime<FixedOffset>,
    /// Current read or purge boundary.
    unread_after_seq: i64,
    /// Current save time.
    pub(super) saved_at: Option<DateTime<FixedOffset>>,
    pub(super) created_at: DateTime<FixedOffset>,
}

impl ListedNotification {
    fn unread_entry_range_at_cutoff(&self) -> Option<UnreadEntryRange> {
        (self.unread_after_seq < self.through_seq).then_some(UnreadEntryRange {
            after_seq: self.unread_after_seq,
            through_seq: self.through_seq,
        })
    }

    pub(super) fn is_unread(&self) -> bool {
        self.unread_entry_range_at_cutoff().is_some()
    }
}

impl From<&NotificationSnapshotRow> for ListedNotification {
    fn from(row: &NotificationSnapshotRow) -> Self {
        Self {
            id: row.id,
            kind: row.kind.into(),
            through_seq: row.through_seq,
            head_inbox_seq: row.head_inbox_seq,
            last_activity_at: row.last_activity_at,
            unread_after_seq: row.unread_after_seq,
            saved_at: row.saved_at,
            created_at: row.created_at,
        }
    }
}

#[derive(Default)]
pub(super) struct ThreadUnreadCommenterSummary {
    pub(super) displayed_user_ids: Vec<i32>,
    pub(super) additional_count: i32,
}

#[derive(FromQueryResult)]
struct ThreadUnreadCommenterSummaryRow {
    notification_id: Uuid,
    commenter_user_id: i32,
    commenter_count: i64,
}

pub(super) async fn load_thread_unread_commenter_summaries<'a>(
    conn: &impl ConnectionTrait,
    notifications: impl IntoIterator<Item = &'a ListedNotification>,
) -> Result<HashMap<Uuid, ThreadUnreadCommenterSummary>, DatabaseError> {
    let notification_id = notification_entry::Column::NotificationId;
    let seq = notification_entry::Column::Seq;

    let unread_thread_entries = notifications
        .into_iter()
        .filter(|notification| {
            notification.kind == NotificationAggregateKind::CommentThreadUpdated
        })
        .filter_map(|notification| {
            notification
                .unread_entry_range_at_cutoff()
                .map(|range| (notification.id, range))
        })
        .fold(Condition::any(), |condition, (id, range)| {
            condition.add(
                notification_id
                    .eq(id)
                    .and(seq.gt(range.after_seq))
                    .and(seq.lte(range.through_seq)),
            )
        });

    if unread_thread_entries.is_empty() {
        return Ok(HashMap::new());
    }

    let query = thread_unread_commenter_summary_query(unread_thread_entries);
    let rows = ThreadUnreadCommenterSummaryRow::find_by_statement(
        conn.get_database_backend().build(&query),
    )
    .all(conn)
    .await
    .db_operation("load thread notification unread commenter summaries")?;

    let mut commenter_summaries = HashMap::<Uuid, (Vec<i32>, i64)>::new();
    for row in rows {
        let (displayed_user_ids, commenter_count) = commenter_summaries
            .entry(row.notification_id)
            .or_insert_with(|| (Vec::new(), row.commenter_count));
        displayed_user_ids.push(row.commenter_user_id);
        *commenter_count = row.commenter_count;
    }

    Ok(commenter_summaries
        .into_iter()
        .map(|(notification_id, (displayed_user_ids, commenter_count))| {
            let displayed_count = i64::try_from(displayed_user_ids.len())
                .expect("displayed commenter count fits in i64");
            let additional_count = i32::try_from(
                commenter_count.min(MAX_UNREAD_COMMENTER_COUNT)
                    - displayed_count,
            )
            .expect("capped additional commenter count fits in i32");

            (
                notification_id,
                ThreadUnreadCommenterSummary {
                    displayed_user_ids,
                    additional_count,
                },
            )
        })
        .collect())
}

fn thread_unread_commenter_summary_query(
    unread_thread_entries: Condition,
) -> SelectStatement {
    let notification_id = notification_entry::Column::NotificationId;
    let actor_id = notification_event::Column::ActorId;
    let seq = notification_entry::Column::Seq;
    let commenter_user_id = Alias::new("commenter_user_id");
    let commenter_activity = Alias::new("commenter_activity");
    let last_seq = Alias::new("last_seq");
    let commenter_count = Alias::new("commenter_count");
    let commenter_rank = Alias::new("commenter_rank");
    let ranked_commenters = Alias::new("ranked_commenters");

    let mut commenter_activity_query = Query::select();
    commenter_activity_query
        .column(notification_id)
        .expr_as(
            Expr::col((notification_event::Entity, actor_id)),
            commenter_user_id.clone(),
        )
        .expr_as(Expr::col(seq).max(), last_seq.clone())
        .from(notification_entry::Entity)
        .inner_join(
            notification_event::Entity,
            Expr::col((
                notification_entry::Entity,
                notification_entry::Column::EventId,
            ))
            .equals((
                notification_event::Entity,
                notification_event::Column::Id,
            )),
        )
        .cond_where(unread_thread_entries)
        .group_by_col(notification_id)
        .group_by_col((notification_event::Entity, actor_id));

    let mut commenter_rank_window = WindowStatement::partition_by((
        commenter_activity.clone(),
        notification_id,
    ));
    commenter_rank_window
        .order_by((commenter_activity.clone(), last_seq), Order::Desc);

    let mut ranked_commenter_query = Query::select();
    ranked_commenter_query
        .column((commenter_activity.clone(), notification_id))
        .column((commenter_activity.clone(), commenter_user_id.clone()))
        .expr_window_as(
            Func::count(Expr::col((
                commenter_activity.clone(),
                notification_id,
            ))),
            WindowStatement::partition_by((
                commenter_activity.clone(),
                notification_id,
            )),
            commenter_count.clone(),
        )
        .expr_window_as(
            Expr::cust("ROW_NUMBER()"),
            commenter_rank_window,
            commenter_rank.clone(),
        )
        .from_subquery(commenter_activity_query, commenter_activity);

    let mut query = Query::select();
    query
        .column((ranked_commenters.clone(), notification_id))
        .column((ranked_commenters.clone(), commenter_user_id))
        .column((ranked_commenters.clone(), commenter_count))
        .from_subquery(ranked_commenter_query, ranked_commenters.clone())
        .and_where(
            Expr::col((ranked_commenters.clone(), commenter_rank.clone()))
                .lte(MAX_DISPLAYED_COMMENTER_COUNT),
        )
        .order_by((ranked_commenters.clone(), notification_id), Order::Asc)
        .order_by((ranked_commenters, commenter_rank), Order::Asc);

    query
}

/// Latest entry visible in the snapshot and its source event.
pub(super) struct ListedNotificationEvent {
    pub(super) id: i64,
    pub(super) event_type: DbNotificationEventType,
    pub(super) actor_id: i32,
    pub(super) occurred_at: DateTime<FixedOffset>,
    pub(super) correction_id: Option<i32>,
    pub(super) image_queue_id: Option<i32>,
    pub(super) comment_thread_id: Option<i32>,
    pub(super) comment_id: Option<i32>,
    pub(super) target_user_id: Option<i32>,
    pub(super) user_collection_id: Option<i32>,
    pub(super) account_role_names: Option<Vec<String>>,
    pub(super) comment_content: Option<String>,
}

pub(super) struct RawNotification {
    pub(super) listed: ListedNotification,
    pub(super) event: ListedNotificationEvent,
}

impl From<NotificationSnapshotRow> for RawNotification {
    fn from(row: NotificationSnapshotRow) -> Self {
        let listed = ListedNotification::from(&row);

        Self {
            listed,
            event: ListedNotificationEvent {
                id: row.event_id,
                event_type: row.event_type,
                actor_id: row.actor_id,
                occurred_at: row.occurred_at,
                correction_id: row.correction_id,
                image_queue_id: row.image_queue_id,
                comment_thread_id: row.comment_thread_id,
                comment_id: row.comment_id,
                target_user_id: row.target_user_id,
                user_collection_id: row.user_collection_id,
                account_role_names: None,
                comment_content: None,
            },
        }
    }
}

#[derive(FromQueryResult)]
struct NotificationSnapshotRow {
    id: Uuid,
    kind: DbNotificationAggregateKind,
    unread_after_seq: i64,
    saved_at: Option<DateTime<FixedOffset>>,
    created_at: DateTime<FixedOffset>,
    last_activity_at: DateTime<FixedOffset>,
    through_seq: i64,
    head_inbox_seq: i64,
    event_id: i64,
    event_type: DbNotificationEventType,
    actor_id: i32,
    occurred_at: DateTime<FixedOffset>,
    correction_id: Option<i32>,
    image_queue_id: Option<i32>,
    comment_thread_id: Option<i32>,
    comment_id: Option<i32>,
    target_user_id: Option<i32>,
    user_collection_id: Option<i32>,
}

async fn load_notification_data(
    conn: &impl ConnectionTrait,
    notifications: &mut [RawNotification],
) -> Result<(), DatabaseError> {
    let mut account_event_ids = HashSet::new();
    let mut comment_event_ids = HashSet::new();

    for notification in notifications.iter() {
        let event_id = notification.event.id;
        match notification.listed.kind {
            NotificationAggregateKind::AccountRoleChanged => {
                account_event_ids.insert(event_id);
            }
            NotificationAggregateKind::CommentThreadUpdated
            | NotificationAggregateKind::CommentReplied => {
                comment_event_ids.insert(event_id);
            }
            NotificationAggregateKind::CorrectionReviewRequested
            | NotificationAggregateKind::CorrectionUpdated
            | NotificationAggregateKind::CorrectionModerated
            | NotificationAggregateKind::UserFollowed
            | NotificationAggregateKind::CollectionFollowed
            | NotificationAggregateKind::CollectionItemAdded
            | NotificationAggregateKind::ImageQueueModerated => {}
        }
    }

    let account_roles =
        load_account_role_names(conn, account_event_ids).await?;
    let comment_contents =
        load_comment_contents(conn, comment_event_ids).await?;

    for notification in notifications {
        let event_id = notification.event.id;
        match notification.listed.kind {
            NotificationAggregateKind::AccountRoleChanged => {
                notification.event.account_role_names =
                    account_roles.get(&event_id).cloned();
            }
            NotificationAggregateKind::CommentThreadUpdated
            | NotificationAggregateKind::CommentReplied => {
                notification.event.comment_content =
                    comment_contents.get(&event_id).cloned();
            }
            NotificationAggregateKind::CorrectionReviewRequested
            | NotificationAggregateKind::CorrectionUpdated
            | NotificationAggregateKind::CorrectionModerated
            | NotificationAggregateKind::UserFollowed
            | NotificationAggregateKind::CollectionFollowed
            | NotificationAggregateKind::CollectionItemAdded
            | NotificationAggregateKind::ImageQueueModerated => {}
        }
    }

    Ok(())
}

async fn load_account_role_names(
    conn: &impl ConnectionTrait,
    event_ids: HashSet<i64>,
) -> Result<HashMap<i64, Vec<String>>, DatabaseError> {
    let mut role_names = event_ids
        .iter()
        .copied()
        .map(|event_id| (event_id, Vec::new()))
        .collect::<HashMap<_, _>>();

    if event_ids.is_empty() {
        return Ok(role_names);
    }

    let rows = account_role_changed_notification_event::Entity::find()
        .select_only()
        .column(
            account_role_changed_notification_event::Column::NotificationEventId,
        )
        .column(role::Column::Name)
        .join(
            JoinType::InnerJoin,
            account_role_changed_notification_event::Relation::Role.def(),
        )
        .filter(
            account_role_changed_notification_event::Column::NotificationEventId
                .is_in(event_ids),
        )
        .order_by_asc(
            account_role_changed_notification_event::Column::NotificationEventId,
        )
        .order_by_asc(
            account_role_changed_notification_event::Column::RoleId,
        )
        .into_tuple::<(i64, String)>()
        .all(conn)
        .await
        .db_operation("load account role changed notification data")?;

    for (event_id, role_name) in rows {
        role_names.entry(event_id).or_default().push(role_name);
    }

    Ok(role_names)
}

async fn load_comment_contents(
    conn: &impl ConnectionTrait,
    event_ids: HashSet<i64>,
) -> Result<HashMap<i64, String>, DatabaseError> {
    if event_ids.is_empty() {
        return Ok(HashMap::new());
    }

    comment_created_notification_event::Entity::find()
        .filter(
            comment_created_notification_event::Column::NotificationEventId
                .is_in(event_ids),
        )
        .all(conn)
        .await
        .db_operation("load comment created notification data")
        .map(|rows| {
            rows.into_iter()
                .map(|row| (row.notification_event_id, row.content))
                .collect()
        })
}

async fn list_snapshot_heads(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    query: RawNotificationBatchQuery,
) -> Result<Vec<RawNotification>, DatabaseError> {
    let aggregate = notification::Entity;
    let event = notification_event::Entity;

    let head = Alias::new("snapshot_head");
    let head_inbox_seq =
        Expr::col((head.clone(), notification_entry::Column::InboxSeq));
    let newer_at_cutoff = newer_entry_at_cutoff(&head, query.cutoff);

    let mut statement = snapshot_head_projection(&head);
    statement
        .from_as(notification_entry::Entity, head.clone())
        .inner_join(
            aggregate,
            Expr::col((
                head.clone(),
                notification_entry::Column::NotificationId,
            ))
            .equals((aggregate, notification::Column::Id)),
        )
        .inner_join(
            event,
            Expr::col((head.clone(), notification_entry::Column::EventId))
                .equals((event, notification_event::Column::Id)),
        )
        .and_where(
            Expr::col((head.clone(), notification_entry::Column::RecipientId))
                .eq(recipient_id),
        )
        .and_where(head_inbox_seq.clone().lte(query.cutoff.inbox_seq()))
        .and_where(ExprTrait::not(Expr::exists(newer_at_cutoff)));

    match query.state {
        NotificationState::Inbox => {}
        NotificationState::Unread => {
            statement.and_where(
                Expr::col((head.clone(), notification_entry::Column::Seq))
                    .gt(unread_after_seq()),
            );
        }
        NotificationState::Saved => {
            statement.and_where(notification::Column::SavedAt.is_not_null());
        }
    }

    if let Some(category) = query.category {
        statement.and_where(notification::Column::Kind.is_in(category.kinds()));
    }
    if let Some(before_inbox_seq) = query.before_inbox_seq {
        statement.and_where(head_inbox_seq.clone().lt(before_inbox_seq));
    }

    statement
        .order_by_expr(head_inbox_seq.into(), Order::Desc)
        .limit(
            u64::try_from(query.limit)
                .expect("notification batch limit fits in u64"),
        );

    NotificationSnapshotRow::find_by_statement(
        conn.get_database_backend().build(&statement),
    )
    .all(conn)
    .await
    .db_operation("list notification snapshot heads")
    .map(|rows| rows.into_iter().map(Into::into).collect())
}

fn snapshot_head_projection(head: &Alias) -> SelectStatement {
    let aggregate = notification::Entity;
    let event = notification_event::Entity;
    let text = Alias::new("text");

    Query::select()
        .columns([
            (aggregate, notification::Column::Id),
            (aggregate, notification::Column::SavedAt),
            (aggregate, notification::Column::CreatedAt),
        ])
        .expr_as(
            Expr::col((aggregate, notification::Column::Kind))
                .cast_as(text.clone()),
            Alias::new("kind"),
        )
        .expr_as(unread_after_seq(), Alias::new("unread_after_seq"))
        .expr_as(
            Expr::col((head.clone(), notification_entry::Column::CreatedAt)),
            Alias::new("last_activity_at"),
        )
        .expr_as(
            Expr::col((head.clone(), notification_entry::Column::Seq)),
            Alias::new("through_seq"),
        )
        .expr_as(
            Expr::col((head.clone(), notification_entry::Column::InboxSeq)),
            Alias::new("head_inbox_seq"),
        )
        .expr_as(
            Expr::col((event, notification_event::Column::Id)),
            Alias::new("event_id"),
        )
        .expr_as(
            Expr::col((event, notification_event::Column::EventType))
                .cast_as(text),
            Alias::new("event_type"),
        )
        .columns([
            (event, notification_event::Column::ActorId),
            (event, notification_event::Column::OccurredAt),
            (event, notification_event::Column::CorrectionId),
            (event, notification_event::Column::ImageQueueId),
            (event, notification_event::Column::CommentThreadId),
            (event, notification_event::Column::CommentId),
            (event, notification_event::Column::TargetUserId),
            (event, notification_event::Column::UserCollectionId),
        ])
        .to_owned()
}

fn newer_entry_at_cutoff(head: &Alias, cutoff: InboxCutoff) -> SelectStatement {
    let notification_id = notification_entry::Column::NotificationId;
    let inbox_seq = notification_entry::Column::InboxSeq;
    let newer = Alias::new("newer_entry");

    Query::select()
        .expr(1)
        .from_as(notification_entry::Entity, newer.clone())
        .and_where(
            Expr::col((newer.clone(), notification_id))
                .eq(Expr::col((head.clone(), notification_id))),
        )
        .and_where(
            Expr::col((newer.clone(), inbox_seq))
                .gt(Expr::col((head.clone(), inbox_seq))),
        )
        .and_where(Expr::col((newer, inbox_seq)).lte(cutoff.inbox_seq()))
        .to_owned()
}
