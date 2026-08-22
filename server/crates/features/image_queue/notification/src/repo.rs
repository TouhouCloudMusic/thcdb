use entity::image_queue_subscription;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};

pub(super) async fn load_subscribers(
    conn: &impl ConnectionTrait,
    image_queue_id: i32,
    actor_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    image_queue_subscription::Entity::find()
        .select_only()
        .column(image_queue_subscription::Column::UserId)
        .filter(
            image_queue_subscription::Column::ImageQueueId.eq(image_queue_id),
        )
        .filter(image_queue_subscription::Column::UserId.ne(actor_id))
        .into_tuple::<i32>()
        .all(conn)
        .await
        .db_operation("resolve image queue notification subscribers")
}
