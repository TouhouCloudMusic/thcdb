use chrono::{DateTime, FixedOffset};
use sea_orm::{ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter};

pub(super) async fn delete_expired_unverified_users(
    conn: &impl ConnectionTrait,
    cutoff: DateTime<FixedOffset>,
) -> Result<u64, DbErr> {
    entity::user::Entity::delete_many()
        .filter(entity::user::Column::EmailVerified.eq(false))
        .filter(entity::user::Column::CreatedAt.lt(cutoff))
        .exec(conn)
        .await
        .map(|result| result.rows_affected)
}
