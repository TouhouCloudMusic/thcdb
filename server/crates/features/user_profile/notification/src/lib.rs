use infra_db::error::DatabaseError;
use notification_core::{CreateNotificationsCommand, NotificationRecipients};
use sea_orm::DatabaseTransaction;

pub struct FollowerId(pub i32);

pub struct FollowedUserId(pub i32);

pub async fn create_user_followed_notification(
    conn: &DatabaseTransaction,
    FollowerId(follower_id): FollowerId,
    FollowedUserId(target_user_id): FollowedUserId,
) -> Result<NotificationRecipients, DatabaseError> {
    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::UserFollowed {
            actor_id: follower_id,
            target_user_id,
        },
    )
    .await
}
