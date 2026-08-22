use entity::notification;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::prelude::Uuid;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};
use sea_query::{Expr, all};

use crate::inbox::unread_after_seq;

pub(super) async fn count(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    cap: u64,
) -> Result<usize, DatabaseError> {
    notification::Entity::find()
        .select_only()
        .column(notification::Column::Id)
        .filter(all![
            notification::Column::RecipientId.eq(recipient_id),
            Expr::col(notification::Column::LastSeq).gt(unread_after_seq()),
        ])
        .limit(cap)
        .into_tuple::<Uuid>()
        .all(conn)
        .await
        .db_operation("count unread notifications")
        .map(|rows| rows.len())
}
