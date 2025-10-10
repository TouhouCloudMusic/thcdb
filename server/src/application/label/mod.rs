use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::TransactionManager;
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::domain::label::{NewLabel, TxRepo};
use crate::infra;

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
    Infra { source: infra::Error },
}

impl<E> From<E> for CreateError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
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
        correction: NewCorrection<NewLabel>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewLabel> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                status: CorrectionStatus::Approved,
                history_id,
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
        correction: NewCorrection<NewLabel>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        // Create label history from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        {
            let correction_service =
                super::correction::Service::new(tx_repo.clone());

            correction_service
                .upsert(NewCorrectionMeta::<NewLabel> {
                    author: correction.author,
                    r#type: correction.r#type,
                    entity_id: id,
                    status: CorrectionStatus::Pending,
                    history_id,
                    description: correction.description,
                    phantom: std::marker::PhantomData,
                })
                .await?;
        }

        tx_repo.commit().await?;

        Ok(())
    }
}
