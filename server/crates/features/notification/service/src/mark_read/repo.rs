use entity::{notification, notification_entry};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{ConnectionTrait, DatabaseTransaction, JoinType, Order};
use sea_query::{
    Alias, Expr, ExprTrait, Func, IntoIden, LockType, Query, SimpleExpr,
    TableRef,
};

use crate::inbox::{InboxCutoff, entry_sequences_at_cutoff};

pub(super) async fn read_all(
    conn: &DatabaseTransaction,
    recipient_id: i32,
    inbox_cutoff: InboxCutoff,
) -> Result<(), DatabaseError> {
    let entries_relation = Alias::new("entries_at_cutoff");
    let through_seq = Alias::new("through_seq");

    let entries_at_cutoff = entry_sequences_at_cutoff(
        recipient_id,
        inbox_cutoff,
        through_seq.clone(),
    );
    let entry_notification_id: SimpleExpr = Expr::col((
        entries_relation.clone(),
        notification_entry::Column::NotificationId,
    ))
    .into();
    let entry_through_seq: SimpleExpr =
        Expr::col((entries_relation.clone(), through_seq)).into();
    let read_through_seq: SimpleExpr =
        Expr::col((notification::Entity, notification::Column::ReadThroughSeq))
            .into();
    let read_through_is_behind =
        read_through_seq.clone().lt(entry_through_seq.clone());

    // Lock the target rows in stable order before the bulk update, which cannot guarantee its own lock order.
    let lock_query = Query::select()
        .column((notification::Entity, notification::Column::Id))
        .from(notification::Entity)
        .join_subquery(
            JoinType::InnerJoin,
            entries_at_cutoff.clone(),
            entries_relation.clone(),
            Expr::col((notification::Entity, notification::Column::Id))
                .eq(entry_notification_id.clone()),
        )
        .and_where(read_through_is_behind.clone())
        .order_by((notification::Entity, notification::Column::Id), Order::Asc)
        .lock_with_tables(LockType::Update, [notification::Entity])
        .to_owned();

    conn.execute(conn.get_database_backend().build(&lock_query))
        .await
        .db_operation("lock notifications for mark all read")?;

    let update_query = Query::update()
        .table(notification::Entity)
        .value(
            notification::Column::ReadThroughSeq,
            Func::greatest([read_through_seq, entry_through_seq]),
        )
        .from(TableRef::SubQuery(
            entries_at_cutoff,
            entries_relation.into_iden(),
        ))
        .and_where(
            Expr::col((notification::Entity, notification::Column::Id))
                .eq(entry_notification_id),
        )
        .and_where(read_through_is_behind)
        .to_owned();

    conn.execute(conn.get_database_backend().build(&update_query))
        .await
        .db_operation("mark all notifications read")
        .map(|_| ())
}
