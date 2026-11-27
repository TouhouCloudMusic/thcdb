use axum::extract::FromRef;
use credit_role_repo::write::{self, NewCreditRole};
use entity::enums::EntityType;
use infra_db::SeaOrmRepository;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::features::correction::{
    CorrectionEntity, CorrectionSubmitResult, NewCorrection, NewCorrectionMeta,
    SubmissionError, service as correction_service,
};
use crate::features::user_event::UserEventSender;

#[cfg(all(test, feature = "integration-test"))]
mod tests;

impl CorrectionEntity for NewCreditRole {
    fn entity_type() -> EntityType {
        EntityType::CreditRole
    }
}

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
    user_events: UserEventSender,
}

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
            user_events: input.user_events.clone(),
        }
    }
}

impl Service {
    pub async fn create(
        &self,
        correction: NewCorrection<NewCreditRole>,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        let entity_id = write::create(tx_repo.conn(), &correction.data).await?;

        let history_id =
            write::create_history(tx_repo.conn(), &correction.data).await?;

        let correction_id = correction_service::create(
            &tx_repo,
            NewCorrectionMeta::<NewCreditRole> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            },
        )
        .await?;

        tx_repo
            .commit()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        Ok(CorrectionSubmitResult::submitted(correction_id, entity_id))
    }

    pub async fn upsert_correction(
        &self,
        id: i32,
        correction: NewCorrection<NewCreditRole>,
        mode: correction_service::CorrectionUpsertMode,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        let history_id =
            write::create_history(tx_repo.conn(), &correction.data).await?;

        let result = correction_service::upsert(
            tx_repo,
            NewCorrectionMeta::<NewCreditRole> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id: id,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            },
            mode,
        )
        .await?;

        Ok(result.publish_and_respond(id, &self.user_events))
    }
}
