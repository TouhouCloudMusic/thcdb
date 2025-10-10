use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::TransactionManager;
use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::credit_role::{NewCreditRole, TxRepo};

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
}

impl<A> From<A> for CreateError
where
    A: Into<crate::infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]

pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
}

impl<A> From<A> for UpsertCorrectionError
where
    A: Into<crate::infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: Clone + TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewCreditRole>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;

        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewCreditRole> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                status: CorrectionStatus::Approved,
                description: correction.description,
                phantom: std::marker::PhantomData,
            })
            .await?;

        correction_service.repo.commit().await?;

        Ok(())
    }

    pub async fn upsert_correction(
        &self,
        id: i32,
        correction: NewCorrection<NewCreditRole>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        let history_id = tx_repo.create_history(&correction.data).await?;
        let correction_service = super::correction::Service::new(tx_repo);

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
            .await?;

        correction_service.repo.commit().await?;

        Ok(())
    }
}
