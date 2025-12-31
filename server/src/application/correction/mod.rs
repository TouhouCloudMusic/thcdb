use axum::http::StatusCode;
use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    self, ApproveCorrectionContext, CorrectionEntity, CorrectionFilter,
    NewCorrectionMeta,
};
use crate::domain::model::{CorrectionApprover, UserRoleEnum};
use crate::domain::user::User;
use crate::domain::{Transaction, TransactionManager};
use crate::infra;
use crate::infra::error::Error as InfraError;

mod model;
pub use model::*;

use super::error::Unauthorized;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum Error {
    #[snafu(display("Correction already approved"))]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    AlreadyApproved,
    #[snafu(display("Correction not found"))]
    #[api_error(
        status_code = StatusCode::NOT_FOUND,
    )]
    NotFound,
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Unauthorized { source: Unauthorized },
}

impl<A> From<A> for Error
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
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
    ) -> Result<(), Error> {
        let _ = self.repo.create(meta.into()).await?;
        Ok(())
    }

    pub async fn create2<T: CorrectionEntity>(
        &self,
        meta: impl Into<NewCorrectionMeta<T>>,
    ) -> Result<i32, InfraError> {
        let correction_id = self.repo.create(meta.into()).await?;
        Ok(correction_id)
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
            .ok_or(Error::NotFound)?;

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
                Err(Unauthorized::new())?;
            }

            let _ = self.repo.create(meta).await?;
        } else if prev_correction.status == CorrectionStatus::Approved {
            return Err(Error::AlreadyApproved);
        } else {
            self.repo.update(prev_correction.id, meta).await?;
        }

        Ok(())
    }

    pub async fn upsert2<T: CorrectionEntity>(
        &self,
        meta: NewCorrectionMeta<T>,
    ) -> Result<(), Error> {
        self.upsert(meta).await
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: correction::TxRepo + Transaction,
{
    pub async fn approve<Ctx>(
        &self,
        correction_id: i32,
        user: User,
        context: Ctx,
    ) -> Result<(), Error>
    where
        Ctx: ApproveCorrectionContext,
    {
        let approver = CorrectionApprover::from_user(user)
            .ok_or_else(Unauthorized::new)?;

        let tx_repo = self.repo.begin().await?;

        tx_repo.approve(correction_id, approver, context).await?;

        tx_repo.commit().await?;

        Ok(())
    }
}
