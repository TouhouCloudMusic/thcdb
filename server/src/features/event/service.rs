use entity::enums::CorrectionStatus;
use garde::Validate;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::ValidationError;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::correction::service as correction_service;
use crate::features::event::error::{CreateError, UpsertCorrectionError};
use crate::features::event::model::NewEvent;
use crate::infra;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewEvent>,
) -> Result<CorrectionSubmissionResult, CreateError> {
    correction
        .data
        .validate()
        .map_err(ValidationError::from)
        .map_err(|source| CreateError::Validation { source })?;

    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_id = correction_service::create2(
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
    .await
    .map_err(|source| CreateError::Infra { source })?;

    tx_repo.commit().await.map_err(infra::Error::from)?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id,
    })
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    entity_id: i32,
    correction: NewCorrection<NewEvent>,
) -> Result<CorrectionSubmissionResult, UpsertCorrectionError> {
    correction
        .data
        .validate()
        .map_err(ValidationError::from)
        .map_err(|source| UpsertCorrectionError::Validation { source })?;

    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    correction_service::upsert(
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
    )
    .await
    .map_err(|source| UpsertCorrectionError::Correction { source })?;

    let correction_id = correction::Repo::find_one(
        &tx_repo,
        correction::CorrectionFilter::latest(
            entity_id,
            entity::enums::EntityType::Event,
        ),
    )
    .await
    .map_err(|err| infra::Error::Internal { source: err })
    .map_err(|source| UpsertCorrectionError::Infra { source })?
    .ok_or_else(|| infra::Error::custom(&"Correction not found"))?
    .id;

    tx_repo.commit().await.map_err(infra::Error::from)?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id,
    })
}
