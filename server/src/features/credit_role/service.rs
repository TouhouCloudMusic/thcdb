use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmitResult;
use crate::domain::correction::{NewCorrection, NewCorrectionMeta};
use crate::features::correction::{
    SubmissionError, service as correction_service,
};
use crate::features::credit_role::model::NewCreditRole;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewCreditRole>,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    let tx_repo = repo.begin_tx().await?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_id = correction_service::create(
        &tx_repo,
        NewCorrectionMeta::<NewCreditRole> {
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
    id: i32,
    correction: NewCorrection<NewCreditRole>,
    mode: correction_service::CorrectionUpsertMode,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    let tx_repo = repo.begin_tx().await?;

    if let Some(correction_id) =
        correction_service::find_create_conflict_for_mode::<NewCreditRole>(
            &tx_repo, id, &mode,
        )
        .await?
    {
        return Ok(CorrectionSubmitResult::conflict(correction_id, id));
    }

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let result = correction_service::upsert(
        &tx_repo,
        NewCorrectionMeta::<NewCreditRole> {
            author: correction.author,
            r#type: correction.r#type,
            entity_id: id,
            status: CorrectionStatus::Pending,
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
        } => {
            tx_repo.commit().await?;
            Ok(CorrectionSubmitResult::submitted(correction_id, id))
        }
        correction_service::CorrectionUpsertResult::Conflict {
            correction_id,
        } => Ok(CorrectionSubmitResult::conflict(correction_id, id)),
    }
}
