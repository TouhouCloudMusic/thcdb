use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::correction::{
    SubmissionError, service as correction_service,
};
use crate::features::song_lyrics::model::NewSongLyrics;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewSongLyrics>,
) -> Result<CorrectionSubmissionResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    correction_service::create(
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

    let correction_id = correction::Repo::find_one(
        &tx_repo,
        correction::CorrectionFilter::latest(
            entity_id,
            entity::enums::EntityType::SongLyrics,
        ),
    )
    .await?
    .ok_or(SubmissionError::NotFound)?
    .id;

    tx_repo.commit().await?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id,
    })
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    lyrics_id: i32,
    correction: NewCorrection<NewSongLyrics>,
) -> Result<CorrectionSubmissionResult, SubmissionError> {
    correction
        .data
        .validate()
        .map_err(|source| SubmissionError::Validation(source.to_string()))?;

    let tx_repo = repo.begin_tx().await?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    correction_service::upsert(
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
    )
    .await?;

    let correction_id = correction::Repo::find_one(
        &tx_repo,
        correction::CorrectionFilter::latest(
            lyrics_id,
            entity::enums::EntityType::SongLyrics,
        ),
    )
    .await?
    .ok_or(SubmissionError::NotFound)?
    .id;

    tx_repo.commit().await?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id: lyrics_id,
    })
}
