use derive_more::From;
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    NewCorrection, NewCorrectionMeta, {self},
};
use crate::domain::credit_role::model::NewCreditRole;
use crate::domain::credit_role::repo::{
    CommonFilter, FindManyFilter, QueryKind,
};
use crate::domain::credit_role::{Repo, TxRepo};
use crate::domain::repository::TransactionManager;
use crate::infra::Error;

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
    #[from(forward)]
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
}

impl<R> Service<R>
where
    R: Repo,
    crate::infra::Error: From<R::Error>,
{
    pub async fn find_one<K: QueryKind>(
        &self,
        id: i32,
        common: CommonFilter,
    ) -> Result<Option<K::Output>, Error> {
        Ok(self.repo.find_one::<K>(id, common).await?)
    }

    pub async fn find_many_credit_roles<K: QueryKind>(
        &self,
        filter: FindManyFilter,
        common: CommonFilter,
    ) -> Result<Vec<K::Output>, Error> {
        Ok(self.repo.find_many::<K>(filter, common).await?)
    }
}

impl<R, TR> Service<R>
where
    R: Repo + TransactionManager<TransactionRepository = TR>,
    TR: Clone + TxRepo + correction::TxRepo,
    crate::infra::Error: From<R::Error> + From<TR::Error>,
{
    pub async fn create(
        &self,
        correction: NewCorrection<NewCreditRole>,
    ) -> Result<(), CreateError> {
        let tx_repo = self.repo.begin().await?;

        let entity_id = TxRepo::create(&tx_repo, &correction.data).await?;

        let history_id = tx_repo.create_history(&correction.data).await?;

        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .create(NewCorrectionMeta::<NewCreditRole> {
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
        correction: NewCorrection<NewCreditRole>,
    ) -> Result<(), UpsertCorrectionError> {
        let tx_repo = self.repo.begin().await?;

        let history_id = tx_repo.create_history(&correction.data).await?;
        let correction_service = super::correction::Service::new(tx_repo);

        correction_service
            .upsert(NewCorrectionMeta::<NewCreditRole> {
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
