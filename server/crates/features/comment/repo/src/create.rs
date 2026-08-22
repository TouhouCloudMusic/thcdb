use entity::enums::CommentState;
use entity::{comment, comment_target, comment_thread};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QuerySelect,
};
use sea_query::OnConflict;

use crate::CommentTarget;
use crate::comment_target::get_or_create_target;
use crate::query::find_active_comment_in_thread;

pub struct CreatedComment {
    comment: comment::Model,
    target: comment_target::Model,
    in_reply_to: Option<comment::Model>,
}

impl CreatedComment {
    pub const fn comment(&self) -> &comment::Model {
        &self.comment
    }

    pub const fn target(&self) -> &comment_target::Model {
        &self.target
    }

    pub const fn in_reply_to(&self) -> Option<&comment::Model> {
        self.in_reply_to.as_ref()
    }
}

pub struct CommentThread {
    model: comment_thread::Model,
    target: comment_target::Model,
}

impl CommentThread {
    pub async fn lock_or_create(
        conn: &impl ConnectionTrait,
        target: CommentTarget,
    ) -> Result<Self, DatabaseError> {
        let target = get_or_create_target(conn, target).await?;

        let thread = if let Some(thread) =
            lock_thread_by_target_id(conn, target.id).await?
        {
            thread
        } else {
            let mut inserted =
                comment_thread::Entity::insert(comment_thread::ActiveModel {
                    id: NotSet,
                    target_id: Set(target.id),
                })
                .on_conflict(
                    OnConflict::column(comment_thread::Column::TargetId)
                        .do_nothing()
                        .to_owned(),
                )
                .exec_with_returning_many(conn)
                .await
                .db_operation("create comment thread")?;

            if let Some(thread) = inserted.pop() {
                thread
            } else {
                lock_thread_by_target_id(conn, target.id)
                    .await?
                    .ok_or_else(|| {
                        DatabaseError::internal(format!(
                            "comment thread for target reference #{} missing after insert conflict",
                            target.id,
                        ))
                    })?
            }
        };

        Ok(Self {
            model: thread,
            target,
        })
    }

    pub const fn id(&self) -> i32 {
        self.model.id
    }

    pub async fn create_comment(
        &self,
        conn: &impl ConnectionTrait,
        author_id: i32,
        in_reply_to_comment_id: Option<i32>,
        content: String,
    ) -> Result<CreatedComment, CreateCommentError> {
        let in_reply_to = if let Some(comment_id) = in_reply_to_comment_id {
            let comment =
                find_active_comment_in_thread(conn, comment_id, self.model.id)
                    .await?
                    .ok_or(CreateCommentError::InvalidInReplyToComment)?;

            Some(comment)
        } else {
            None
        };

        let comment = insert_comment(
            conn,
            self.model.id,
            author_id,
            in_reply_to.as_ref().map(|comment| comment.id),
            content,
        )
        .await?;

        Ok(CreatedComment {
            comment,
            target: self.target.clone(),
            in_reply_to,
        })
    }
}

#[derive(Debug, derive_more::From)]
pub enum CreateCommentError {
    InvalidInReplyToComment,
    #[from]
    Database(DatabaseError),
}

async fn lock_thread_by_target_id(
    conn: &impl ConnectionTrait,
    target_id: i32,
) -> Result<Option<comment_thread::Model>, DatabaseError> {
    comment_thread::Entity::find()
        .filter(comment_thread::Column::TargetId.eq(target_id))
        .lock_exclusive()
        .one(conn)
        .await
        .db_operation("lock existing comment thread")
}

async fn insert_comment(
    conn: &impl ConnectionTrait,
    thread_id: i32,
    author_id: i32,
    in_reply_to_comment_id: Option<i32>,
    content: String,
) -> Result<comment::Model, DatabaseError> {
    comment::Entity::insert(comment::ActiveModel {
        id: NotSet,
        content: Set(content),
        state: Set(CommentState::Visable),
        author_id: Set(author_id),
        thread_id: Set(thread_id),
        in_reply_to_comment_id: Set(in_reply_to_comment_id),
        created_at: NotSet,
        updated_at: NotSet,
    })
    .exec_with_returning(conn)
    .await
    .db_operation("insert comment")
}
