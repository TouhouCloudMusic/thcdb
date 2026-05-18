use infra_db::SeaOrmRepository;

use super::model::CorrectionHistoryItem;
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

    pub(super) async fn list_entity_corrections(
        &self,
        entity_type: entity::enums::EntityType,
        entity_id: i32,
    ) -> Result<Vec<CorrectionHistoryItem>, ReadError> {
        let corrections = repo::list_approved_corrections(
            &self.repo.conn,
            entity_type,
            entity_id,
        )
        .await
        .db_operation("find correction history")?;

        if corrections.is_empty() {
            return Ok(Vec::new());
        }

        let correction_ids =
            corrections.iter().map(|model| model.id).collect::<Vec<_>>();
        let revision_map =
            repo::load_latest_revision_authors(&self.repo.conn, correction_ids)
                .await
                .db_operation("find correction history revisions")?;

        corrections
            .into_iter()
            .map(|correction| {
                let revision =
                    revision_map.get(&correction.id).ok_or_else(|| {
                        ReadError::NotFound("Correction revision not found")
                    })?;

                Ok(CorrectionHistoryItem {
                    id: correction.id,
                    r#type: correction.r#type,
                    created_at: correction.created_at,
                    handled_at: correction.handled_at,
                    author: revision.author.clone(),
                    description: revision.description.clone(),
                })
            })
            .collect()
    }
}
