use entity::enums::CorrectionStatus;
use infra_db::SeaOrmRepository;

use crate::features::correction::{
    CorrectionSubmitResult, NewCorrection, NewCorrectionMeta, SubmissionError,
    service as correction_service,
};
use crate::features::song::model::NewSong;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewSong>,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate(None)
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;
    let tx_repo = repo
        .begin_tx()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_id = correction_service::create(
        &tx_repo,
        NewCorrectionMeta::<NewSong> {
            author: correction.author,
            r#type: correction.r#type,
            status: CorrectionStatus::Approved,
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
    repo: &SeaOrmRepository,
    id: i32,
    correction: NewCorrection<NewSong>,
    mode: correction_service::CorrectionUpsertMode,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate(Some(id))
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;
    let tx_repo = repo
        .begin_tx()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;

    if let Some(correction_id) =
        correction_service::find_create_conflict_for_mode::<NewSong>(
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
        NewCorrectionMeta::<NewSong> {
            author: correction.author,
            r#type: correction.r#type,
            status: CorrectionStatus::Pending,
            entity_id: id,
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
            tx_repo
                .commit()
                .await
                .map_err(crate::infra::database::error::DatabaseError::from)?;
            Ok(CorrectionSubmitResult::submitted(correction_id, id))
        }
        correction_service::CorrectionUpsertResult::Conflict {
            correction_id,
        } => Ok(CorrectionSubmitResult::conflict(correction_id, id)),
    }
}
