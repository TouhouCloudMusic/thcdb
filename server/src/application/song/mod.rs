use derive_more::{Display, From};
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::domain::repository::TransactionManager;
use crate::domain::song::model::{NewSong, Song};
use crate::domain::song::repo::{Repo, TxRepo};
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
}

#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum UpsertCorrectionError {
    #[from(forward)]
    Infra(InfraError),
    #[from]
    Correction(super::correction::Error),
}

impl<R> Service<R>
where
    R: Repo,
{
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Song>, InfraError> {
        Ok(self.repo.find_by_id(id).await?)
    }

    pub async fn find_by_keyword(
        &self,
        kw: &str,
    ) -> Result<Vec<Song>, InfraError> {
        Ok(self.repo.find_by_keyword(kw).await?)
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: TxRepo + correction::TxRepo,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewSong>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewSong> {
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
        correction: NewCorrection<NewSong>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        // Create song history from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert(NewCorrectionMeta::<NewSong> {
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
