use entity::enums::CorrectionStatus;
use garde::Validate;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::release::error::{CreateError, UpsertCorrectionError};
use crate::features::release::model::NewRelease;
use crate::infra;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewRelease>,
) -> Result<CorrectionSubmissionResult, CreateError> {
    correction.data.validate().map_err(|e| CreateError::Validation {
        message: e.to_string(),
    })?;

    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let entity_id =
        super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    correction_service
        .create(NewCorrectionMeta::<NewRelease> {
            author: correction.author,
            r#type: correction.r#type,
            status: CorrectionStatus::Approved,
            entity_id,
            history_id,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await?;

    let correction_id = correction::Repo::find_one(
        &correction_service.repo,
        correction::CorrectionFilter::latest(
            entity_id,
            entity::enums::EntityType::Release,
        ),
    )
    .await
    .map_err(|err| infra::Error::Internal { source: err })?
    .ok_or_else(|| infra::Error::custom(&"Correction not found"))?
    .id;

    correction_service
        .repo
        .commit()
        .await
        .map_err(infra::Error::from)?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id,
    })
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    id: i32,
    correction: NewCorrection<NewRelease>,
) -> Result<CorrectionSubmissionResult, UpsertCorrectionError> {
    correction.data.validate().map_err(|e| {
        UpsertCorrectionError::Validation {
            message: e.to_string(),
        }
    })?;

    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    correction_service
        .upsert(NewCorrectionMeta::<NewRelease> {
            author: correction.author,
            r#type: correction.r#type,
            status: CorrectionStatus::Pending,
            entity_id: id,
            history_id,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await?;

    let correction_id = correction::Repo::find_one(
        &correction_service.repo,
        correction::CorrectionFilter::latest(
            id,
            entity::enums::EntityType::Release,
        ),
    )
    .await
    .map_err(|err| infra::Error::Internal { source: err })?
    .ok_or_else(|| infra::Error::custom(&"Correction not found"))?
    .id;

    correction_service
        .repo
        .commit()
        .await
        .map_err(infra::Error::from)?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id: id,
    })
}
