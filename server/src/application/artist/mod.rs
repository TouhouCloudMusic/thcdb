use derive_more::{Display, From};
use macros::{ApiError, IntoErrorSchema};

use crate::domain::artist::model::{NewArtist, ValidationError};
use crate::domain::artist::repository::{Repo, TxRepo};
use crate::domain::correction::NewCorrection;
use crate::domain::repository::{Transaction, TransactionManager};
use crate::error::InfraError;

pub mod upload_profile_image;

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

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: TxRepo + Transaction,
    InfraError: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        correction.data.validate()?;

        let _ = tx_repo.create(correction).await?;

        tx_repo.commit().await?;

        Ok(())
    }
}
