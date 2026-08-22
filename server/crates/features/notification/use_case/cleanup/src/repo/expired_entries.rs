use std::collections::BTreeMap;

use chrono::{DateTime, FixedOffset};
use entity::{notification, notification_entry};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityName,
    EntityTrait, FromQueryResult, IdenStatic, QueryFilter, SelectModel,
    SelectorRaw, Statement, TryGetableMany, Value,
};
use sea_query::{Condition, Expr, Query, all};

use super::LockedNotification;

const POSITION: &str = "position";
const BELONGS_TO_EXPIRED_PREFIX: &str = "belongs_to_expired_prefix";

#[derive(FromQueryResult)]
struct DeletedEntry {
    notification_id: Uuid,
    seq: i64,
    event_id: i64,
}

#[derive(Default)]
pub(super) struct DeletedEntryBatch {
    pub(super) count: u64,
    pub(super) event_ids: Vec<i64>,
}

impl From<Vec<DeletedEntry>> for DeletedEntryBatch {
    fn from(entries: Vec<DeletedEntry>) -> Self {
        Self {
            count: u64::try_from(entries.len())
                .expect("notification entry batch length fits in u64"),
            event_ids: entries
                .into_iter()
                .map(|entry| entry.event_id)
                .collect(),
        }
    }
}

pub(super) async fn delete_for_notifications(
    tx: &DatabaseTransaction,
    notification_ids: &[Uuid],
) -> Result<DeletedEntryBatch, DbErr> {
    delete_notification_entries(
        tx,
        all![
            notification_entry::Column::NotificationId
                .is_in(notification_ids.iter().copied())
        ],
    )
    .await
    .map(Into::into)
}

pub(super) async fn purge_expired_batch(
    tx: &DatabaseTransaction,
    notifications: &[LockedNotification],
    cutoff: DateTime<FixedOffset>,
    entry_limit: u64,
) -> Result<DeletedEntryBatch, DbErr> {
    let entries =
        load_expired_batch(tx, notifications, cutoff, entry_limit).await?;
    if entries.is_empty() {
        return Ok(DeletedEntryBatch::default());
    }

    let deleted = delete_notification_entries(
        tx,
        all![
            Expr::tuple([
                Expr::col(notification_entry::Column::NotificationId).into(),
                Expr::col(notification_entry::Column::Seq).into(),
            ])
            .in_tuples(entries.iter().copied(),)
        ],
    )
    .await?;

    advance_purged_through_sequences(tx, &deleted).await?;

    Ok(deleted.into())
}

async fn load_expired_batch(
    tx: &DatabaseTransaction,
    notifications: &[LockedNotification],
    cutoff: DateTime<FixedOffset>,
    entry_limit: u64,
) -> Result<Vec<(Uuid, i64)>, DbErr> {
    if notifications.is_empty() || entry_limit == 0 {
        return Ok(Vec::new());
    }

    let nt = notification::Entity.table_name();
    let et = notification_entry::Entity.table_name();
    let nid = notification_entry::Column::NotificationId.as_str();
    let id = notification::Column::Id.as_str();
    let uid = notification::Column::RecipientId.as_str();
    let purged = notification::Column::PurgedThroughSeq.as_str();
    let last = notification::Column::LastSeq.as_str();
    let seq = notification_entry::Column::Seq.as_str();
    let created = notification_entry::Column::CreatedAt.as_str();
    let ids = (2..notifications.len() + 2)
        .map(|position| format!("${position}"))
        .collect::<Vec<_>>()
        .join(", ");
    let limit = notifications.len() + 2;
    let sql = format!(
        r"
WITH numbered_entries AS (
    SELECT
        n.{uid},
        e.{nid},
        n.{purged},
        e.{seq},
        e.{created},
        row_number() OVER (
            PARTITION BY e.{nid}
            ORDER BY e.{seq}
        ) AS {POSITION}
    FROM {et} AS e
    INNER JOIN {nt} AS n ON e.{nid} = n.{id}
    WHERE n.{id} IN ({ids})
        AND e.{seq} > n.{purged}
        AND e.{seq} < n.{last}
        AND e.{seq} - n.{purged} <= ${limit}
),
expired_prefix AS (
    SELECT
        {uid},
        {nid},
        {seq},
        bool_and(
            {seq} = {purged} + {POSITION} AND {created} < $1
        ) OVER (
            PARTITION BY {nid}
            ORDER BY {seq}
            ROWS UNBOUNDED PRECEDING
        ) AS {BELONGS_TO_EXPIRED_PREFIX}
    FROM numbered_entries
)
SELECT {nid}, {seq}
FROM expired_prefix
WHERE {BELONGS_TO_EXPIRED_PREFIX}
ORDER BY {uid}, {nid}, {seq}
LIMIT ${limit}
",
    );
    let mut values = Vec::<Value>::with_capacity(notifications.len() + 2);
    values.push(cutoff.into());
    values.extend(
        notifications
            .iter()
            .map(|notification| notification.id.into()),
    );
    values.push(entry_limit.into());

    tx.query_all(Statement::from_sql_and_values(
        tx.get_database_backend(),
        sql,
        values,
    ))
    .await?
    .into_iter()
    .map(|row| <(Uuid, i64)>::try_get_many_by_index(&row).map_err(Into::into))
    .collect()
}

async fn advance_purged_through_sequences(
    tx: &DatabaseTransaction,
    entries: &[DeletedEntry],
) -> Result<(), DbErr> {
    let mut boundaries = BTreeMap::new();
    for entry in entries {
        boundaries
            .entry(entry.notification_id)
            .and_modify(|through_seq: &mut i64| {
                *through_seq = (*through_seq).max(entry.seq);
            })
            .or_insert(entry.seq);
    }

    let mut boundaries = boundaries.into_iter();
    let Some((first_notification_id, first_seq)) = boundaries.next() else {
        return Ok(());
    };
    let mut through_seq = Expr::case(
        notification::Column::Id.eq(first_notification_id),
        first_seq,
    );
    let mut notification_ids = vec![first_notification_id];
    for (notification_id, seq) in boundaries {
        through_seq =
            through_seq.case(notification::Column::Id.eq(notification_id), seq);
        notification_ids.push(notification_id);
    }

    notification::Entity::update_many()
        .col_expr(
            notification::Column::PurgedThroughSeq,
            through_seq
                .finally(Expr::col(notification::Column::PurgedThroughSeq))
                .into(),
        )
        .filter(notification::Column::Id.is_in(notification_ids))
        .exec(tx)
        .await?;

    Ok(())
}

async fn delete_notification_entries(
    tx: &DatabaseTransaction,
    filter: Condition,
) -> Result<Vec<DeletedEntry>, DbErr> {
    let query = Query::delete()
        .from_table(notification_entry::Entity)
        .cond_where(filter)
        .returning(Query::returning().columns([
            notification_entry::Column::NotificationId,
            notification_entry::Column::Seq,
            notification_entry::Column::EventId,
        ]))
        .to_owned();

    SelectorRaw::<SelectModel<DeletedEntry>>::from_statement(
        tx.get_database_backend().build(&query),
    )
    .all(tx)
    .await
}
