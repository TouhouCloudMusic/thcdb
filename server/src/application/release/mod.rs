use derive_more::{Display, From};
use entity::enums::CorrectionStatus;
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

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum CreateError {
    #[from(forward)]
    Correction(super::correction::Error),
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum UpsertCorrectionError {
    #[from(forward)]
    Infra(crate::infra::Error),
    #[from]
    Correction(super::correction::Error),
}

impl<R> Service<R>
where
    R: Repo,
{
    pub async fn find_one(
        &self,
        filter: Filter,
    ) -> Result<Option<Release>, Error> {
        self.repo.find_one(filter).await
    }

    pub async fn find_many(
        &self,
        filter: Filter,
    ) -> Result<Vec<Release>, Error> {
        self.repo.find_many(filter).await
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
