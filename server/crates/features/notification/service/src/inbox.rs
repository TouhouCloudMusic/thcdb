use entity::{notification, notification_entry, notification_inbox_state};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};
use sea_query::{Alias, Expr, Func, Query, SelectStatement, SimpleExpr};

#[derive(Clone, Copy)]
pub(crate) struct InboxCutoff(i64);

impl InboxCutoff {
    pub(crate) const fn new(inbox_seq: i64) -> Self {
        Self(inbox_seq)
    }

    /// Reads the committed Inbox boundary captured by the first notification page.
    pub(crate) async fn load(
        conn: &impl ConnectionTrait,
        recipient_id: i32,
    ) -> Result<Self, DatabaseError> {
        notification_inbox_state::Entity::find()
            .select_only()
            .column(notification_inbox_state::Column::LastInboxSeq)
            .filter(
                notification_inbox_state::Column::RecipientId.eq(recipient_id),
            )
            .into_tuple::<i64>()
            .one(conn)
            .await
            .db_operation("load notification inbox cutoff")
            .map(|sequence| Self::new(sequence.unwrap_or(0)))
    }

    pub(crate) const fn inbox_seq(self) -> i64 {
        self.0
    }
}

pub(crate) fn entry_sequences_at_cutoff(
    recipient_id: i32,
    cutoff: InboxCutoff,
    through_seq: Alias,
) -> SelectStatement {
    Query::select()
        .column(notification_entry::Column::NotificationId)
        .expr_as(
            Expr::col(notification_entry::Column::Seq).max(),
            through_seq,
        )
        .from(notification_entry::Entity)
        .and_where(
            Expr::col(notification_entry::Column::RecipientId).eq(recipient_id),
        )
        .and_where(
            Expr::col(notification_entry::Column::InboxSeq)
                .lte(cutoff.inbox_seq()),
        )
        .group_by_col(notification_entry::Column::NotificationId)
        .to_owned()
}

pub(crate) fn unread_after_seq() -> SimpleExpr {
    Func::greatest([
        Expr::col(notification::Column::ReadThroughSeq).into(),
        Expr::col(notification::Column::PurgedThroughSeq).into(),
    ])
    .into()
}
