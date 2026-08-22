use entity::correction_subscription;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter};
use sea_query::OnConflict;

pub async fn subscribe(
    conn: &impl ConnectionTrait,
    user_id: i32,
    correction_id: i32,
) -> Result<(), DatabaseError> {
    correction_subscription::Entity::insert(
        correction_subscription::ActiveModel {
            user_id: Set(user_id),
            correction_id: Set(correction_id),
        },
    )
    .on_conflict(
        OnConflict::columns([
            correction_subscription::Column::UserId,
            correction_subscription::Column::CorrectionId,
        ])
        .do_nothing()
        .to_owned(),
    )
    .exec_without_returning(conn)
    .await
    .db_operation("subscribe to correction")?;

    Ok(())
}

pub async fn unsubscribe(
    conn: &impl ConnectionTrait,
    user_id: i32,
    correction_id: i32,
) -> Result<(), DatabaseError> {
    correction_subscription::Entity::delete_many()
        .filter(sea_query::all![
            correction_subscription::Column::UserId.eq(user_id),
            correction_subscription::Column::CorrectionId.eq(correction_id)
        ])
        .exec(conn)
        .await
        .db_operation("unsubscribe from correction")?;

    Ok(())
}
