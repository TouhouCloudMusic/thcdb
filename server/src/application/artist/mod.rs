use derive_more::{Display, From};
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::artist;
use crate::domain::artist::model::{NewArtist, ValidationError};
use crate::domain::artist::repo::Repo;
use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::repository::TransactionManager;

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum CreateError {
    #[from(forward)]
    Correction(super::correction::Error),
    #[from]
    Validation(ValidationError),
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum UpsertCorrectionError {
    #[from(forward)]
    Infra(crate::infra::Error),
    #[from]
    Validation(ValidationError),
    #[from]
    Correction(super::correction::Error),
}

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: Clone + artist::TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<(), CreateError> {
        correction.data.validate()?;

        let tx_repo = self.repo.begin().await?;

        let entity_id =
            artist::TxRepo::create(&tx_repo, &correction.data).await?;

        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewArtist> {
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
        correction: NewCorrection<NewArtist>,
    ) -> Result<(), UpsertCorrectionError> {
        correction.data.validate()?;

        let tx_repo = self.repo.begin().await?;

        let history_id = tx_repo.create_history(&correction.data).await?;
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
            .await?;

        correction_service.repo.commit().await?;

        Ok(())
    }
}
