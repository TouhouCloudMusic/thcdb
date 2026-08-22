use axum::extract::FromRef;
use garde::Validate;
use infra_db::SeaOrmRepository;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::features::correction::{
    CorrectionSubmitResult, NewCorrection, NewCorrectionMeta, SubmissionError,
    service as correction_service,
};
use crate::features::event::model::NewEvent;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::shared::error::ValidationError;

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
    pub const fn new(
        repo: SeaOrmRepository,
        user_events: UserEventSender,
    ) -> Self {
        Self { repo, user_events }
    }

    pub async fn create(
        &self,
        correction: NewCorrection<NewEvent>,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        correction
            .data
            .validate()
            .map_err(ValidationError::from)
            .map_err(|source| {
                SubmissionError::Validation(source.to_string())
            })?;

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        let entity_id = super::repo::create(&tx_repo, &correction.data).await?;
        let history_id =
            super::repo::create_history(&tx_repo, &correction.data).await?;

        let correction_id = correction_service::create(
            &tx_repo,
            NewCorrectionMeta::<NewEvent> {
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
        entity_id: i32,
        correction: NewCorrection<NewEvent>,
        mode: correction_service::CorrectionUpsertMode,
    ) -> Result<CorrectionSubmitResult, SubmissionError> {
        correction
            .data
            .validate()
            .map_err(ValidationError::from)
            .map_err(|source| {
                SubmissionError::Validation(source.to_string())
            })?;

        let tx_repo = self
            .repo
            .begin_tx()
            .await
            .map_err(crate::infra::database::error::DatabaseError::from)?;

        let history_id =
            super::repo::create_history(&tx_repo, &correction.data).await?;

        let result = correction_service::upsert(
            &tx_repo,
            NewCorrectionMeta::<NewEvent> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                description: correction.description,
                phantom: std::marker::PhantomData,
            },
            mode,
        )
        .await?;

        match result {
            correction_service::CorrectionUpsertResult::Submitted {
                correction_id,
                notification_recipients,
            } => {
                tx_repo.commit().await.map_err(
                    crate::infra::database::error::DatabaseError::from,
                )?;
                self.user_events.publish(
                    UserEvent::NotificationInboxUpdated,
                    notification_recipients.user_ids,
                );

                Ok(CorrectionSubmitResult::submitted(correction_id, entity_id))
            }
            correction_service::CorrectionUpsertResult::Conflict {
                correction_id,
            } => {
                tx_repo.rollback().await.map_err(
                    crate::infra::database::error::DatabaseError::from,
                )?;

                Ok(CorrectionSubmitResult::conflict(correction_id, entity_id))
            }
        }
    }
}
