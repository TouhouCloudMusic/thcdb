use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::credit_role::error::{CreateError, UpsertCorrectionError};
use crate::features::credit_role::model::NewCreditRole;
use crate::infra;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewCreditRole>,
) -> Result<CorrectionSubmissionResult, CreateError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    let correction_id = correction_service
        .create2(NewCorrectionMeta::<NewCreditRole> {
            author: correction.author,
            r#type: correction.r#type,
            entity_id,
            history_id,
            status: CorrectionStatus::Approved,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await
        .map_err(|source| CreateError::Infra { source })?;

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
    correction: NewCorrection<NewCreditRole>,
) -> Result<CorrectionSubmissionResult, UpsertCorrectionError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    correction_service
        .upsert(NewCorrectionMeta::<NewCreditRole> {
            author: correction.author,
            r#type: correction.r#type,
            entity_id: id,
            status: CorrectionStatus::Pending,
            history_id,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await
        .map_err(|source| UpsertCorrectionError::Correction { source })?;

    let correction_id = correction::Repo::find_one(
        &correction_service.repo,
        correction::CorrectionFilter::latest(
            id,
            entity::enums::EntityType::CreditRole,
        ),
    )
    .await
    .map_err(|err| infra::Error::Internal { source: err })
    .map_err(|source| UpsertCorrectionError::Infra { source })?
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
