use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmitResult;
use crate::domain::correction::{NewCorrection, NewCorrectionMeta};
use crate::features::correction::{
    SubmissionError, service as correction_service,
};
use crate::features::song_lyrics::model::NewSongLyrics;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewSongLyrics>,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_id = correction_service::create(
        &tx_repo,
        NewCorrectionMeta::<NewSongLyrics> {
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
    tx_repo.commit().await?;

    Ok(CorrectionSubmitResult::submitted(correction_id, entity_id))
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    lyrics_id: i32,
    correction: NewCorrection<NewSongLyrics>,
    mode: correction_service::CorrectionUpsertMode,
) -> Result<CorrectionSubmitResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

    if let Some(correction_id) =
        correction_service::find_create_conflict_for_mode::<NewSongLyrics>(
            &tx_repo, lyrics_id, &mode,
        )
        .await?
    {
        return Ok(CorrectionSubmitResult::conflict(correction_id, lyrics_id));
    }

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let result = correction_service::upsert(
        &tx_repo,
        NewCorrectionMeta::<NewSongLyrics> {
            author: correction.author,
            r#type: correction.r#type,
            status: CorrectionStatus::Pending,
            entity_id: lyrics_id,
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
            Ok(CorrectionSubmitResult::submitted(correction_id, lyrics_id))
        }
        correction_service::CorrectionUpsertResult::Conflict {
            correction_id,
        } => Ok(CorrectionSubmitResult::conflict(correction_id, lyrics_id)),
    }
}
