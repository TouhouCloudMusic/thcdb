use infra_db::error::DatabaseError;
use notification_core::{
    CorrectionModerationAction, CreateNotificationsCommand,
    NotificationRecipients,
};
use sea_orm::DatabaseTransaction;

mod repo;

pub async fn create_review_requested(
    conn: &DatabaseTransaction,
    actor_id: i32,
    correction_id: i32,
) -> Result<NotificationRecipients, DatabaseError> {
    let recipients = repo::load_review_recipients(conn, actor_id).await?;

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CorrectionReviewRequested {
            actor_id,
            recipients,
            correction_id,
        },
    )
    .await
}

pub async fn create_updated(
    conn: &DatabaseTransaction,
    actor_id: i32,
    correction_id: i32,
    entity_history_id: i32,
) -> Result<NotificationRecipients, DatabaseError> {
    let recipients =
        repo::load_subscribers(conn, correction_id, actor_id).await?;

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CorrectionUpdated {
            actor_id,
            recipients,
            correction_id,
            entity_history_id,
        },
    )
    .await
}

pub async fn create_moderated(
    conn: &DatabaseTransaction,
    actor_id: i32,
    correction_id: i32,
    action: CorrectionModerationAction,
) -> Result<NotificationRecipients, DatabaseError> {
    let recipients = repo::load_author(conn, correction_id)
        .await?
        .filter(|author_id| *author_id != actor_id)
        .into_iter()
        .collect();

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CorrectionModerated {
            actor_id,
            recipients,
            correction_id,
            action,
        },
    )
    .await
}
