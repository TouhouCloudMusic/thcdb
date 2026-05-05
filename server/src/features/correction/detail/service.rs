use super::model::CorrectionDetail;
use crate::features::correction::shared::repo;
use crate::features::correction::{ReadError, comment};
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::SeaOrmRepository;

#[derive(Clone)]
pub(super) struct Service {
    repo: SeaOrmRepository,
}

pub(super) enum FindCorrectionDetailResult {
    Found(CorrectionDetail),
    CorrectionNotFound,
}

impl Service {
    pub(super) const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub(super) async fn find_correction(
        &self,
        correction_id: i32,
    ) -> Result<FindCorrectionDetailResult, ReadError> {
        let Some(model) = repo::find_correction(&self.repo.conn, correction_id)
            .await
            .db_operation("find correction detail")?
        else {
            return Ok(FindCorrectionDetailResult::CorrectionNotFound);
        };

        let entity_name = repo::find_entity_name(
            &self.repo.conn,
            model.entity_type,
            model.entity_id,
        )
        .await
        .db_operation("find correction entity name")?;

        let author = repo::find_author(&self.repo.conn, correction_id)
            .await
            .db_operation("find correction author")?;
        let comments =
            comment::initial_page(&self.repo.conn, correction_id).await?;

        Ok(FindCorrectionDetailResult::Found(CorrectionDetail {
            id: model.id,
            status: model.status,
            r#type: model.r#type,
            entity_id: model.entity_id,
            entity_type: model.entity_type,
            entity_name,
            created_at: model.created_at,
            handled_at: model.handled_at,
            author,
            comments,
        }))
    }
}
