use std::collections::BTreeSet;

use infra_db::error::DatabaseError;
use notification_core::{CreateNotificationsCommand, NotificationRecipients};
use sea_orm::DatabaseTransaction;

pub async fn create_role_changed_notification(
    conn: &DatabaseTransaction,
    actor_id: i32,
    target_user_id: i32,
    new_roles: BTreeSet<i32>,
) -> Result<NotificationRecipients, DatabaseError> {
    if actor_id == target_user_id {
        return Ok(NotificationRecipients::default());
    }

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::AccountRoleChanged {
            actor_id,
            target_user_id,
            new_roles,
        },
    )
    .await
}
