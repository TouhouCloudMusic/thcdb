use entity::enums::CommentState;
use entity::{comment, comment_thread};
use infra_db::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, EntityTrait, IntoActiveModel,
    QuerySelect,
};

async fn lock_thread(
    conn: &impl ConnectionTrait,
    thread_id: i32,
) -> Result<(), DatabaseError> {
    comment_thread::Entity::find_by_id(thread_id)
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock comment thread")?
        .ok_or_else(|| {
            DatabaseError::broken_reference(BrokenEntityReference {
                entity: "comment thread",
                id: thread_id,
            })
        })?;

    Ok(())
}

pub async fn soft_delete_comment(
    conn: &impl ConnectionTrait,
    comment: comment::Model,
) -> Result<(), DatabaseError> {
    lock_thread(conn, comment.thread_id).await?;

    if comment.state == CommentState::Deleted {
        return Ok(());
    }

    let mut active = comment.into_active_model();
    active.state = Set(CommentState::Deleted);
    active
        .update(conn)
        .await
        .db_operation("soft delete comment")?;

    Ok(())
}
