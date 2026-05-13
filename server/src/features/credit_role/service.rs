use entity::enums::CorrectionStatus;

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::features::correction::{
    SubmissionError, service as correction_service,
};
use crate::features::credit_role::model::NewCreditRole;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::SeaOrmRepository;

pub async fn create(
    repo: &SeaOrmRepository,
    correction: NewCorrection<NewCreditRole>,
) -> Result<CorrectionSubmissionResult, SubmissionError> {
    let tx_repo = repo
        .begin_tx()
        .await
        .with_operation("begin credit role creation correction transaction")?;

    let entity_id = super::repo::create(&tx_repo, &correction.data).await?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    let correction_id = correction_service::create2(
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

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id,
    })
}

pub async fn upsert_correction(
    repo: &SeaOrmRepository,
    id: i32,
    correction: NewCorrection<NewCreditRole>,
) -> Result<CorrectionSubmissionResult, SubmissionError> {
    let tx_repo = repo
        .begin_tx()
        .await
        .with_operation("begin credit role update correction transaction")?;

    let history_id =
        super::repo::create_history(&tx_repo, &correction.data).await?;

    correction_service::upsert(
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
    )
    .await?;

    let correction_id = correction::Repo::find_one(
        &tx_repo,
        correction::CorrectionFilter::latest(
            id,
            entity::enums::EntityType::CreditRole,
        ),
    )
    .await?
    .ok_or(SubmissionError::NotFound)?
    .id;

    tx_repo.commit().await?;

    Ok(CorrectionSubmissionResult {
        correction_id,
        entity_id: id,
    })
}
