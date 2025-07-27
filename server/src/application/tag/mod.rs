use derive_more::From;
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::repository::TransactionManager;
use crate::domain::tag::Tag;
use crate::domain::tag::model::NewTag;
use crate::domain::tag::repo::{Repo, TxRepo};
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

#[derive(Debug, From, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[error(transparent)]
    Correction(
        #[from]
        #[backtrace]
        super::correction::Error,
    ),
    #[error(transparent)]
    #[from(forward)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
}

#[derive(Debug, From, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[error(transparent)]
    Correction(
        #[from]
        #[backtrace]
        super::correction::Error,
    ),
    #[error(transparent)]
    #[from(forward)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
}

impl<R> Service<R> {
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }
}

impl<R> Service<R>
where
    R: Repo,
    crate::infra::Error: From<R::Error>,
{
    pub async fn find_by_id(&self, id: i32) -> Result<Option<Tag>, Error> {
        self.repo.find_by_id(id).await.map_err(Error::from)
    }

    pub async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Tag>, Error> {
        self.repo
            .find_by_keyword(keyword)
            .await
            .map_err(Error::from)
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: Clone + TxRepo + correction::TxRepo,
    crate::infra::Error: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewTag>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;

        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewTag> {
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
        correction: NewCorrection<NewTag>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        // Create tag history from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        {
            let correction_service =
                super::correction::Service::new(tx_repo.clone());

            correction_service
                .upsert(NewCorrectionMeta::<NewTag> {
                    author: correction.author,
                    r#type: correction.r#type,
                    entity_id: id,
                    history_id,
                    status: CorrectionStatus::Pending,
                    description: correction.description,
                    phantom: std::marker::PhantomData,
                })
                .await?;
        }

        tx_repo.commit().await?;

        Ok(())
    }
}
