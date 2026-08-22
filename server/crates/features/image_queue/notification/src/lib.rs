use infra_db::error::DatabaseError;
use notification_core::{
    CreateNotificationsCommand, ImageQueueModerationAction,
    NotificationRecipients,
};
use sea_orm::DatabaseTransaction;

mod repo;

pub async fn create_moderated_notification(
    conn: &DatabaseTransaction,
    actor_id: i32,
    image_queue_id: i32,
    action: ImageQueueModerationAction,
) -> Result<NotificationRecipients, DatabaseError> {
    let recipients =
        repo::load_subscribers(conn, image_queue_id, actor_id).await?;
    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::ImageQueueModerated {
            actor_id,
            recipients,
            image_queue_id,
            action,
        },
    )
    .await
}
