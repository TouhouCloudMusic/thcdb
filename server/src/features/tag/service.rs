use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::tag::error::{CreateError, UpsertCorrectionError};
use crate::features::tag::model::NewTag;
use crate::infra;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewTag>,
) -> Result<CorrectionSubmissionResult, CreateError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let entity_id =
        super::repo::create(&tx_repo, &correction.data).await?;
    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    correction_service
        .create(NewCorrectionMeta::<NewTag> {
            author: correction.author,
            r#type: correction.r#type,
            entity_id,
            history_id,
            status: CorrectionStatus::Approved,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await?;

    let correction_id = correction::Repo::find_one(
        &correction_service.repo,
        correction::CorrectionFilter::latest(
            entity_id,
            entity::enums::EntityType::Tag,
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
    correction: NewCorrection<NewTag>,
) -> Result<CorrectionSubmissionResult, UpsertCorrectionError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_service =
        crate::application::correction::Service::new(tx_repo);

    correction_service
        .upsert(NewCorrectionMeta::<NewTag> {
            author: correction.author,
            r#type: correction.r#type,
            entity_id: id,
            status: CorrectionStatus::Pending,
            history_id,
            description: correction.description,
            phantom: std::marker::PhantomData,
        })
        .await?;

    let correction_id = correction::Repo::find_one(
        &correction_service.repo,
        correction::CorrectionFilter::latest(
            id,
            entity::enums::EntityType::Tag,
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
