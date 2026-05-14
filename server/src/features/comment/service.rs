use entity::comment as comment_entity;

use super::error::Error;
use super::model::{
    CommentTarget, CreateEntityCommentRequest, EntityComment, EntityCommentPage,
};
use super::repo;
use crate::domain::model::PermissionName;
use crate::domain::shared::Cursor;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::SeaOrmRepository;

#[derive(Clone)]
pub(crate) struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub(crate) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub(crate) async fn list_comments(
        &self,
        target: CommentTarget,
        target_id: i32,
        cursor: Cursor,
    ) -> Result<EntityCommentPage, Error> {
        ensure_target_exists(&self.repo.conn, target, target_id).await?;
        repo::load_target_comments_page(
            &self.repo.conn,
            target,
            target_id,
            cursor,
        )
        .await
    }

    pub(crate) async fn create_comment(
        &self,
        target: CommentTarget,
        target_id: i32,
        author_id: i32,
        req: CreateEntityCommentRequest,
    ) -> Result<EntityComment, Error> {
        req.validate().map_err(Error::InvalidRequest)?;

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .db_operation("begin comment transaction")?;
        let conn = tx_repo.conn();
        ensure_target_exists(conn, target, target_id).await?;
        let thread =
            repo::get_or_create_thread(conn, target, target_id).await?;
        validate_parent(conn, thread.id, req.parent_id).await?;

        let comment =
            repo::insert_comment(conn, thread.id, author_id, &req).await?;
        let summary = repo::load_comment_summary(conn, comment.id).await?;
        tx_repo.commit().await?;

        Ok(summary)
    }

    pub(crate) async fn delete_comment(
        &self,
        user_id: i32,
        comment_id: i32,
    ) -> Result<(), Error> {
        let comment = repo::find_comment(&self.repo.conn, comment_id).await?;
        if !self.can_delete(user_id, &comment).await? {
            return Err(Error::PermissionDenied);
        }

        repo::soft_delete_comment(&self.repo.conn, comment).await
    }

    async fn can_delete(
        &self,
        user_id: i32,
        comment: &comment_entity::Model,
    ) -> Result<bool, Error> {
        if comment.author_id == user_id {
            return Ok(true);
        }

        crate::infra::authz::user_has_permission(
            &self.repo.conn,
            user_id,
            PermissionName::CommentManage,
        )
        .await
        .db_operation("check comment manage permission")
        .map_err(Into::into)
    }
}

async fn ensure_target_exists(
    conn: &impl sea_orm::ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
) -> Result<(), Error> {
    if target.exists(conn, target_id).await? {
        Ok(())
    } else {
        Err(Error::target_not_found(target))
    }
}

async fn validate_parent(
    conn: &impl sea_orm::ConnectionTrait,
    thread_id: i32,
    parent_id: Option<i32>,
) -> Result<(), Error> {
    let Some(parent_id) = parent_id else {
        return Ok(());
    };

    if repo::active_comment_belongs_to_thread(conn, parent_id, thread_id)
        .await?
    {
        Ok(())
    } else {
        Err(Error::InvalidRequest(
            "Parent comment is not active in this thread".to_string(),
        ))
    }
}
