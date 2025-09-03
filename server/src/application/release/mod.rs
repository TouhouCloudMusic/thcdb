use entity::enums::CorrectionStatus;
use garde::Validate;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::release::repo::Filter;
use crate::domain::release::{NewRelease, Release, Repo, TxRepo};
use crate::domain::repository::TransactionManager;
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[error(transparent)]
    Correction(
        #[from]
        #[backtrace]
        super::correction::Error,
    ),
    #[error(transparent)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
    // TODO: better error
    #[error("Validation error: {0}")]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation(String),
}

impl<E> From<E> for CreateError
where
    E: Into<crate::infra::Error>,
{
    fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[error(transparent)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
    #[error(transparent)]
    Correction(
        #[from]
        #[backtrace]
        super::correction::Error,
    ),
    #[error("Validation error: {0}")]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation(String),
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<crate::infra::Error>,
{
    fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<R> Service<R>
where
    R: Repo,
    crate::infra::Error: From<R::Error>,
{
    pub async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<Option<Release>, Error> {
        Ok(self.repo.find_one(filter).await?)
    }

    pub async fn find_many(
        &self,
        filter: Filter,
    ) -> Result<Vec<Release>, Error> {
        Ok(self.repo.find_many(filter).await?)
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: TxRepo + correction::TxRepo,
    crate::infra::Error: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewRelease>,
    ) -> Result<(), CreateError> {
        correction
            .data
            .validate()
            .map_err(|e| CreateError::Validation(e.to_string()))?;

        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewRelease> {
                author: correction.author,
                r#type: correction.r#type,
                // Auto approved by default
                status: CorrectionStatus::Approved,
                entity_id,
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
        correction: NewCorrection<NewRelease>,
    ) -> Result<(), UpsertCorrectionError> {
        correction
            .data
            .validate()
            .map_err(|e| UpsertCorrectionError::Validation(e.to_string()))?;

        let tx_repo = self.repo.begin().await?;

        // Create Releasehistory from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

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

        correction_service.repo.commit().await?;

        Ok(())
    }
}
