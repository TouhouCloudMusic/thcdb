use entity::enums::CorrectionStatus;
use garde::Validate;

use crate::application::correction::CorrectionSubmitResult;
use crate::domain::ValidationError;
use crate::domain::correction::{NewCorrection, NewCorrectionMeta};
use crate::features::correction::{
    SubmissionError, service as correction_service,
};
use crate::features::event::model::NewEvent;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewEvent>,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(ValidationError::from)
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

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
            status: CorrectionStatus::Approved,
            description: correction.description,
            phantom: std::marker::PhantomData,
        },
    )
    .await?;

    tx_repo.commit().await?;

    Ok(CorrectionSubmitResult::submitted(correction_id, entity_id))
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    entity_id: i32,
    correction: NewCorrection<NewEvent>,
    mode: correction_service::CorrectionUpsertMode,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(ValidationError::from)
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

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
            status: CorrectionStatus::Pending,
            phantom: std::marker::PhantomData,
        },
        mode,
    )
    .await?;
    tx_repo.commit().await?;

    Ok(match result {
        correction_service::CorrectionUpsertResult::Submitted {
            correction_id,
        } => CorrectionSubmitResult::submitted(correction_id, entity_id),
        correction_service::CorrectionUpsertResult::Conflict {
            correction_id,
        } => CorrectionSubmitResult::conflict(correction_id, entity_id),
    })
}
