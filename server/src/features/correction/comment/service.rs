use entity::comment as comment_entity;

use super::error::Error;
use super::model::{CorrectionComment, CreateCorrectionCommentRequest};
use super::repo;
use crate::domain::model::CommentManage;
use crate::domain::shared::CursorResponse;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::shared::http::PaginationQuery;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub(super) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub(super) async fn list_comments(
        &self,
        correction_id: i32,
        pagination: PaginationQuery,
    ) -> Result<CursorResponse<CorrectionComment>, Error> {
        repo::ensure_correction_exists(&self.repo.conn, correction_id).await?;
        repo::load_comments_page(
            &self.repo.conn,
            correction_id,
            pagination.cursor,
            pagination.limit(),
        )
        .await
    }

    pub(super) async fn create_comment(
        &self,
        correction_id: i32,
        author_id: i32,
        req: CreateCorrectionCommentRequest,
    ) -> Result<CorrectionComment, Error> {
        req.validate().map_err(Error::InvalidRequest)?;

        let tx_repo = self.repo.begin_tx().await.map_err(Error::from)?;
        let conn = tx_repo.conn();
        repo::ensure_correction_exists(conn, correction_id).await?;
        let comment =
            repo::insert_comment(conn, correction_id, author_id, &req).await?;
        let summary = repo::load_comment_summary(conn, comment.id).await?;
        tx_repo.commit().await?;

        Ok(summary)
    }

    pub(super) async fn delete_comment(
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

        crate::infra::authz::user_has_permission::<CommentManage>(
            &self.repo.conn,
            user_id,
        )
        .await
        .map_err(Error::from)
    }
}
