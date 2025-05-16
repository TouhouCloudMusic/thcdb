use derive_more::{Display, From};
use macros::{ApiError, IntoErrorSchema};

use crate::domain::artist::model::{NewArtist, ValidationError};
use crate::domain::artist::repository::{Repo, TxRepo};
use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::domain::repository::TransactionManager;
use crate::error::InfraError;

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum CreateError {
    #[from(forward)]
    Infra(InfraError),
    #[from]
    Validation(ValidationError),
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum UpsertCorrectionError {
    #[from(forward)]
    Infra(InfraError),
    #[from]
    Validation(ValidationError),
    #[from]
    Correction(super::correction::Error),
}

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: Clone + TxRepo + correction::TxRepo,
    InfraError: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        correction.data.validate()?;

        let _ = TxRepo::create(&tx_repo, correction).await?;

        tx_repo.commit().await?;

        Ok(())
    }

    pub async fn upsert_correction(
        &self,
        id: i32,
        correction: NewCorrection<NewArtist>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        correction.data.validate()?;

        // Create artist history from the data
        let history_id = tx_repo.create_history(&correction).await?;

        {
            let correction_service =
                super::correction::Service::new(tx_repo.clone());

            correction_service
                .upsert_correction(NewCorrectionMeta::<NewArtist> {
                    author: correction.author,
                    r#type: correction.r#type,
                    entity_id: id,
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
