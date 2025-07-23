use derive_more::{Display, From};
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::repository::TransactionManager;
use crate::domain::song_lyrics::model::{
    NewSongLyrics, SongLyrics, ValidationError,
};
use crate::domain::song_lyrics::repo::{
    FindManyFilter, FindOneFilter, Repo, TxRepo,
};
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
    Correction(super::correction::Error),
    #[from]
    Validation(ValidationError),
}

impl<R> Service<R>
where
    R: Repo,
    crate::infra::Error: From<R::Error>,
{
    pub async fn find_one(
        &self,
        filter: FindOneFilter,
    ) -> Result<Option<SongLyrics>, Error> {
        Ok(self.repo.find_one(filter).await?)
    }

    pub async fn find_many(
        &self,
        filter: FindManyFilter,
    ) -> Result<Vec<SongLyrics>, Error> {
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
        correction: NewCorrection<NewSongLyrics>,
    ) -> Result<(), CreateError> {
        // Validate the lyrics data
        correction.data.validate()?;

        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewSongLyrics> {
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
        correction: NewCorrection<NewSongLyrics>,
    ) -> Result<(), UpsertCorrectionError> {
        // Validate the lyrics data
        correction.data.validate()?;

        let tx_repo = self.repo.begin().await?;

        // Create song lyrics history from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert(NewCorrectionMeta::<NewSongLyrics> {
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
