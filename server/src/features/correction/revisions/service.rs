use infra_db::SeaOrmRepository;

use super::model::CorrectionRevisionSummary;
use super::repo;
use crate::features::correction::ReadError;
use crate::infra::database::error::DatabaseResultExt;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub(super) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub(super) async fn list_revisions(
        &self,
        correction_id: i32,
    ) -> Result<Option<Vec<CorrectionRevisionSummary>>, ReadError> {
        if !correction_core::correction_exists(&self.repo.conn, correction_id)
            .await
            .db_context("find correction for revisions")?
        {
            return Ok(None);
        }

        let revisions = repo::list_revisions(&self.repo.conn, correction_id)
            .await
            .db_context("find correction revisions")?;

        Ok(Some(revisions))
    }
}
