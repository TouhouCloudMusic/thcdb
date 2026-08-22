mod error;
mod model;

use auth_core::permission::{Permission, user_has_permission};
use comment_repo::CommentTarget;
pub use comment_repo::CommentTargetKind;
use domain::shared::Cursor;
use entity::comment as comment_entity;
pub use error::{Error, ErrorKind};
use infra_db::SeaOrmRepository;
use infra_db::error::DatabaseResultExt;
use model::ValidatedCreateCommentCommand;
pub use model::{
    COMMENT_CONTENT_MAX_LEN, Comment, CommentAuthor, CommentPage, CommentState,
    CreateCommentCommand,
};
use notification_core::NotificationRecipients;

pub struct CreateCommentResult {
    pub comment: Comment,
    pub notification_recipients: NotificationRecipients,
}

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub async fn list_comments(
        &self,
        target_kind: CommentTargetKind,
        target_id: i32,
        cursor: Cursor,
    ) -> Result<CommentPage, Error> {
        let target =
            CommentTarget::find(&self.repo.conn, target_kind, target_id)
                .await?
                .ok_or_else(|| Error::target_not_found(target_kind))?;

        let page = comment_repo::CommentRecordPage::load(
            &self.repo.conn,
            target,
            cursor,
        )
        .await?;

        Ok(page.into())
    }

    pub async fn create_comment(
        &self,
        command: CreateCommentCommand,
    ) -> Result<CreateCommentResult, Error> {
        let command = command.validate()?;

        self.create_validated_comment(command).await
    }

    async fn create_validated_comment(
        &self,
        command: ValidatedCreateCommentCommand,
    ) -> Result<CreateCommentResult, Error> {
        let CreateCommentCommand {
            target_kind,
            target_id,
            author_id,
            in_reply_to_comment_id,
            content,
            read_through_comment_id,
        } = command.into_inner();

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin comment transaction")?;
        let conn = tx_repo.conn();

        let target = CommentTarget::find(conn, target_kind, target_id)
            .await?
            .ok_or_else(|| Error::target_not_found(target_kind))?;

        let thread =
            comment_repo::CommentThread::lock_or_create(conn, target).await?;

        let created = thread
            .create_comment(conn, author_id, in_reply_to_comment_id, content)
            .await?;

        subscribe(conn, target, author_id).await?;

        let mut notification_recipients =
            comment_notification::create_comment_notifications(conn, &created)
                .await?;

        if let Some(read_boundary_id) = read_through_comment_id
            && let Some(read_boundary) = comment_repo::find_comment_in_thread(
                conn,
                read_boundary_id,
                thread.id(),
            )
            .await?
        {
            let read_boundary_advanced =
                notification_core::mark_comment_thread_read_through(
                    conn,
                    author_id,
                    read_boundary.thread_id,
                    read_boundary.id,
                )
                .await
                .db_operation("mark comment thread read through")?;

            if read_boundary_advanced {
                notification_recipients.user_ids.find_or_insert(author_id);
            }
        }

        let summary = comment_repo::load_comment(conn, created.comment().id)
            .await?
            .into();

        tx_repo.commit().await?;

        Ok(CreateCommentResult {
            comment: summary,
            notification_recipients,
        })
    }

    pub async fn delete_comment(
        &self,
        user_id: i32,
        comment_id: i32,
    ) -> Result<(), Error> {
        let comment = comment_repo::find_comment(&self.repo.conn, comment_id)
            .await?
            .ok_or_else(Error::comment_not_found)?;

        if !self.can_delete(user_id, &comment).await? {
            return Err(Error::permission_denied());
        }

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin delete comment transaction")?;

        comment_repo::soft_delete_comment(tx_repo.conn(), comment).await?;

        tx_repo.commit().await?;

        Ok(())
    }

    async fn can_delete(
        &self,
        user_id: i32,
        comment: &comment_entity::Model,
    ) -> Result<bool, Error> {
        if comment.author_id == user_id {
            return Ok(true);
        }

        user_has_permission(&self.repo.conn, user_id, Permission::CommentManage)
            .await
            .db_operation("check comment manage permission")
            .map_err(Into::into)
    }
}

async fn subscribe(
    conn: &impl sea_orm::ConnectionTrait,
    target: CommentTarget,
    user_id: i32,
) -> Result<(), infra_db::error::DatabaseError> {
    match target.kind() {
        CommentTargetKind::Correction => {
            correction_subscription::subscribe(conn, user_id, target.id()).await
        }
        CommentTargetKind::ImageQueue => {
            image_queue_core::subscribe(conn, user_id, target.id()).await
        }
        CommentTargetKind::Artist
        | CommentTargetKind::Release
        | CommentTargetKind::Song
        | CommentTargetKind::Label
        | CommentTargetKind::Event
        | CommentTargetKind::Tag => Ok(()),
    }
}
