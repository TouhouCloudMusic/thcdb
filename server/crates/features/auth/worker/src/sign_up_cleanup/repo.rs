use chrono::{DateTime, FixedOffset};
use infra_db::error::{DatabaseError, DatabaseFailure};
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};

#[infra_db::observe("auth.sign_up_cleanup.delete_expired_unverified_users")]
pub(super) async fn delete_expired_unverified_users(
    conn: &impl ConnectionTrait,
    cutoff: DateTime<FixedOffset>,
) -> Result<u64, DatabaseError> {
    entity::user::Entity::delete_many()
        .filter(entity::user::Column::EmailVerified.eq(false))
        .filter(entity::user::Column::CreatedAt.lt(cutoff))
        .exec(conn)
        .await
        .map(|result| result.rows_affected)
        .map_err(|error| DatabaseFailure::new(error))
}
