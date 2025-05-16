use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    self, ApproveCorrectionContext, CorrectionEntity, CorrectionFilter,
    NewCorrectionMeta, TxRepo,
};
use crate::domain::model::auth::{CorrectionApprover, UserRoleEnum};
use crate::domain::repository::{Transaction, TransactionManager};
use crate::domain::user::User;
use crate::error::{InfraError, Unauthorized};

mod model;
pub use model::*;

#[derive(
    Debug,
    derive_more::Display,
    derive_more::From,
    derive_more::Error,
    ApiError,
    IntoErrorSchema,
)]
pub enum Error {
    #[from(forward)]
    Infra(InfraError),
    #[from]
    Unauthorized(Unauthorized),
}

#[derive(Clone)]
pub struct Service<R> {
    pub repo: R,
}

impl<R> Service<R>
where
    R: correction::TxRepo,
{
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }

    // TODO: Add self approval
    pub async fn create<T: CorrectionEntity>(
        &self,
        meta: impl Into<NewCorrectionMeta<T>>,
    ) -> Result<(), InfraError> {
        self.repo.create(meta.into()).await?;
        Ok(())
    }

    pub async fn upsert<T: CorrectionEntity>(
        &self,
        meta: NewCorrectionMeta<T>,
    ) -> Result<(), Error> {
        let prev_correction = self
            .repo
            .find_one(CorrectionFilter::latest(
                meta.entity_id,
                T::entity_type(),
            ))
            .await?
            .expect("Correction not found");

        if prev_correction.status == CorrectionStatus::Pending {
            let is_author_or_admin = if meta
                .author
                .has_roles(&[UserRoleEnum::Admin, UserRoleEnum::Moderator])
            {
                true
            } else {
                self.repo.is_author(&meta.author, &prev_correction).await?
            };

            if !is_author_or_admin {
                Err(Unauthorized)?;
            }

            self.repo.create(meta).await?;
        } else {
            self.repo.update(prev_correction.id, meta).await?;
        }

        Ok(())
    }
}

impl<R> Service<R>
where
    R: TransactionManager,
    R::TransactionRepository: correction::TxRepo,
{
    pub async fn approve(
        &self,
        correction_id: i32,
        user: User,
        context: impl ApproveCorrectionContext,
    ) -> Result<(), Error> {
        let approver =
            CorrectionApprover::from_user(user).ok_or(Unauthorized)?;

        let tx_repo = self.repo.begin().await?;

        tx_repo.approve(correction_id, approver, context).await?;

        tx_repo.commit().await?;

        Ok(())
    }
}
