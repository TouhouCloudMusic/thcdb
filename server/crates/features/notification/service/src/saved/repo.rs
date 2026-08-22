use chrono::{DateTime, FixedOffset};
use entity::notification;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::prelude::Uuid;
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use sea_query::{Alias, Expr, Func, SimpleExpr};

pub(super) async fn save(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
) -> Result<u64, DatabaseError> {
    set_saved_at(
        conn,
        recipient_id,
        notification_id,
        Func::coalesce([
            Expr::col(notification::Column::SavedAt).into(),
            Func::cust(Alias::new("clock_timestamp")).into(),
        ])
        .into(),
    )
    .await
}

pub(super) async fn unsave(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
) -> Result<u64, DatabaseError> {
    set_saved_at(
        conn,
        recipient_id,
        notification_id,
        Expr::value(Option::<DateTime<FixedOffset>>::None),
    )
    .await
}

async fn set_saved_at(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notification_id: Uuid,
    saved_at: SimpleExpr,
) -> Result<u64, DatabaseError> {
    notification::Entity::update_many()
        .col_expr(notification::Column::SavedAt, saved_at)
        .filter(sea_query::all![
            notification::Column::Id.eq(notification_id),
            notification::Column::RecipientId.eq(recipient_id),
        ])
        .exec(conn)
        .await
        .db_operation("update notification saved state")
        .map(|result| result.rows_affected)
}
