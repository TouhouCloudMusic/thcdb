use derive_more::{Display, From};
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{self, NewCorrection, NewCorrectionMeta};
use crate::domain::label::model::NewLabel;
use crate::domain::label::repo::{Repo, TxRepo};
use crate::domain::label::{self, Label};
use crate::domain::repository::TransactionManager;
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
    R: label::Repo,
{
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Label>, InfraError> {
        Ok(self.repo.find_by_id(id).await?)
    }

    pub async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Label>, InfraError> {
        Ok(self.repo.find_by_keyword(keyword).await?)
    }
}

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: Clone + TxRepo + correction::TxRepo,
    InfraError: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewLabel>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;
        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewLabel> {
                author: correction.author,
                r#type: correction.r#type,
                entity_id,
                status: CorrectionStatus::Approved,
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
        correction: NewCorrection<NewLabel>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        // Create label history from the data
        let history_id = tx_repo.create_history(&correction.data).await?;

        {
            let correction_service =
                super::correction::Service::new(tx_repo.clone());

            correction_service
                .upsert(NewCorrectionMeta::<NewLabel> {
                    author: correction.author,
                    r#type: correction.r#type,
                    entity_id: id,
                    status: CorrectionStatus::Pending,
                    history_id,
                    description: correction.description,
                    phantom: std::marker::PhantomData,
                })
                .await?;
        }

        tx_repo.commit().await?;

        Ok(())
    }
}
