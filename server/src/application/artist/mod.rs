use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::application::correction::CorrectionSubmissionResult;
use crate::domain::artist::{NewArtist, ValidationError};
use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::{TransactionManager, artist};
use crate::infra;

#[derive(Clone)]
pub struct Service<A> {
    pub conn: A,
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[snafu(transparent)]
    Validation { source: ValidationError },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Validation { source: ValidationError },
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

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<Conn, Repo> Service<Conn>
where
    Conn: TransactionManager<TransactionRepository = Repo>,
    Repo: artist::TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<CorrectionSubmissionResult, CreateError> {
        correction
            .data
            .validate()
            .map_err(|source| CreateError::Validation { source })?;

        let tx_repo = self.conn.begin().await?;

        let entity_id = artist::TxRepo::create(&tx_repo, &correction.data)
            .await
            .map_err(infra::Error::from)?;

        let history_id = tx_repo
            .create_history(&correction.data)
            .await
            .map_err(infra::Error::from)?;

        let correction_service = super::correction::Service::new(tx_repo);

        let correction_id = correction_service
            .create2(NewCorrectionMeta::<NewArtist> {
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
        &self,
        id: i32,
        correction: NewCorrection<NewArtist>,
    ) -> Result<CorrectionSubmissionResult, UpsertCorrectionError> {
        correction
            .data
            .validate()
            .map_err(|source| UpsertCorrectionError::Validation { source })?;

        let tx_repo = self.conn.begin().await?;

        let history_id = tx_repo
            .create_history(&correction.data)
            .await
            .map_err(infra::Error::from)?;
        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert(NewCorrectionMeta::<NewArtist> {
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
                entity::enums::EntityType::Artist,
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
}
