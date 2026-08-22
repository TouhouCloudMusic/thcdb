use entity::{correction_subscription, image_queue_subscription};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};

pub(crate) async fn load_correction_subscribers(
    conn: &impl ConnectionTrait,
    correction_id: i32,
    excluded_user_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    correction_subscription::Entity::find()
        .select_only()
        .column(correction_subscription::Column::UserId)
        .filter(correction_subscription::Column::CorrectionId.eq(correction_id))
        .filter(correction_subscription::Column::UserId.ne(excluded_user_id))
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve comment correction subscribers")
}

pub(crate) async fn load_image_queue_subscribers(
    conn: &impl ConnectionTrait,
    image_queue_id: i32,
    excluded_user_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    image_queue_subscription::Entity::find()
        .select_only()
        .column(image_queue_subscription::Column::UserId)
        .filter(
            image_queue_subscription::Column::ImageQueueId.eq(image_queue_id),
        )
        .filter(image_queue_subscription::Column::UserId.ne(excluded_user_id))
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve comment image queue subscribers")
}
