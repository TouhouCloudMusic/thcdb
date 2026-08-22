use comment_repo::CreatedComment;
use entity::comment_target;
use infra_db::error::DatabaseError;
use notification_core::{CreateNotificationsCommand, NotificationRecipients};
use sea_orm::DatabaseTransaction;

use crate::repo;

pub async fn create_comment_notifications(
    conn: &DatabaseTransaction,
    created: &CreatedComment,
) -> Result<NotificationRecipients, DatabaseError> {
    let comment = created.comment();
    let thread_recipients =
        load_target_subscribers(conn, created.target(), comment.author_id)
            .await?;

    let reply_recipient_id = created
        .in_reply_to()
        .filter(|in_reply_to| in_reply_to.author_id != comment.author_id)
        .map(|in_reply_to| in_reply_to.author_id);

    if reply_recipient_id.is_none() && thread_recipients.is_empty() {
        return Ok(NotificationRecipients::default());
    }

    notification_core::create_notifications(
        conn,
        CreateNotificationsCommand::CommentCreated {
            actor_id: comment.author_id,
            thread_recipients,
            thread_id: comment.thread_id,
            comment_id: comment.id,
            content: comment.content.clone(),
            occurred_at: comment.created_at,
            reply_recipient_id,
        },
    )
    .await
}

async fn load_target_subscribers(
    conn: &DatabaseTransaction,
    target: &comment_target::Model,
    excluded_user_id: i32,
) -> Result<Vec<i32>, DatabaseError> {
    let subscribers = if let Some(correction_id) = target.correction_id {
        repo::load_correction_subscribers(conn, correction_id, excluded_user_id)
            .await?
    } else if let Some(image_queue_id) = target.image_queue_id {
        repo::load_image_queue_subscribers(
            conn,
            image_queue_id,
            excluded_user_id,
        )
        .await?
    } else {
        // Comments on other targets notify only the author being replied to.
        Vec::new()
    };

    Ok(subscribers)
}
