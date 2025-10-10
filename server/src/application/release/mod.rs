use entity::enums::CorrectionStatus;
use garde::Validate;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::TransactionManager;
use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::release::{NewRelease, TxRepo};

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
#[snafu(module)]
pub enum CreateError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    // TODO: better error
    #[snafu(display("Validation error: {message}"))]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation { message: String },
}

impl<E> From<E> for CreateError
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
#[snafu(module)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(display("Validation error: {message}"))]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation { message: String },
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewRelease>,
    ) -> Result<(), CreateError> {
        correction
            .data
            .validate()
            .map_err(|e| CreateError::Validation {
                message: e.to_string(),
            })?;

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
        correction.data.validate().map_err(|e| {
            UpsertCorrectionError::Validation {
                message: e.to_string(),
            }
        })?;

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
