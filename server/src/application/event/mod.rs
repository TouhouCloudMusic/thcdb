use entity::enums::CorrectionStatus;
use garde::Validate;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::domain::event::NewEvent;
use crate::domain::repository::TransactionManager;
use crate::domain::{ValidationError, event};
use crate::infra;
use crate::infra::error::Error;

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
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validation {
        source: ValidationError<garde::Report>,
    },
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
#[snafu(module)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validation {
        source: ValidationError<garde::Report>,
    },
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<R> Service<R>
where
    R: event::Repo,
{
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<event::Event>, Error> {
        Ok(event::Repo::find_by_id(&self.repo, id).await?)
    }

    pub async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<event::Event>, Error> {
        Ok(event::Repo::find_by_keyword(&self.repo, keyword).await?)
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: event::TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewEvent>,
    ) -> Result<(), CreateError> {
        correction.data.validate().map_err(ValidationError::from)?;

        let tx_repo = self.repo.begin().await?;

        // TODO: Create entity in event repo, create correction in correction repo
        let entity_id =
            event::TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id =
            event::TxRepo::create_history(&tx_repo, &correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewEvent> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                status: CorrectionStatus::Approved,
                description: correction.description,
                phantom: std::marker::PhantomData,
            })
            .await?;

        let tx_repo = correction_service.repo;

        tx_repo.commit().await?;

        Ok(())
    }

    pub async fn upsert_correction(
        &self,
        entity_id: i32,
        correction: NewCorrection<NewEvent>,
    ) -> Result<(), UpsertCorrectionError> {
        correction.data.validate().map_err(ValidationError::from)?;

        let tx_repo = self.repo.begin().await?;

        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert(NewCorrectionMeta::<NewEvent> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                history_id,
                description: correction.description,
                status: CorrectionStatus::Pending,
                phantom: std::marker::PhantomData,
            })
            .await?;

        let tx_repo = correction_service.repo;

        tx_repo.commit().await?;

        Ok(())
    }
}
