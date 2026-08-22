use auth_core::permission::{Permission, user_has_permission};
use entity::{image_queue, image_queue_subscription};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QuerySelect,
};
use sea_query::OnConflict;

mod target;

pub use target::{ImageQueueTarget, load_targets};

pub async fn exists(
    conn: &impl ConnectionTrait,
    image_queue_id: i32,
) -> Result<bool, DatabaseError> {
    image_queue::Entity::find_by_id(image_queue_id)
        .exists(conn)
        .await
        .db_operation("check image queue exists")
}

pub async fn subscribe(
    conn: &impl ConnectionTrait,
    user_id: i32,
    image_queue_id: i32,
) -> Result<(), DatabaseError> {
    image_queue_subscription::Entity::insert(
        image_queue_subscription::ActiveModel {
            user_id: Set(user_id),
            image_queue_id: Set(image_queue_id),
        },
    )
    .on_conflict(
        OnConflict::columns([
            image_queue_subscription::Column::UserId,
            image_queue_subscription::Column::ImageQueueId,
        ])
        .do_nothing()
        .to_owned(),
    )
    .exec_without_returning(conn)
    .await
    .db_operation("subscribe to image queue")?;

    Ok(())
}

pub async fn unsubscribe(
    conn: &impl ConnectionTrait,
    user_id: i32,
    image_queue_id: i32,
) -> Result<(), DatabaseError> {
    image_queue_subscription::Entity::delete_many()
        .filter(image_queue_subscription::Column::UserId.eq(user_id))
        .filter(
            image_queue_subscription::Column::ImageQueueId.eq(image_queue_id),
        )
        .exec(conn)
        .await
        .db_operation("unsubscribe from image queue")?;

    Ok(())
}

pub async fn can_access(
    conn: &impl ConnectionTrait,
    user_id: i32,
    image_queue_id: i32,
) -> Result<Option<bool>, DatabaseError> {
    let Some(created_by) = image_queue::Entity::find_by_id(image_queue_id)
        .select_only()
        .column(image_queue::Column::CreatedBy)
        .into_tuple::<i32>()
        .one(conn)
        .await
        .db_operation("load image queue access target")?
    else {
        return Ok(None);
    };

    if created_by == user_id {
        return Ok(Some(true));
    }

    user_has_permission(conn, user_id, Permission::ImageQueueManage)
        .await
        .db_operation("check image queue manage permission")
        .map(Some)
}
