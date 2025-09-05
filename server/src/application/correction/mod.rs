use entity::enums::CorrectionStatus;
use eros::IntoUnionResult;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    self, ApproveCorrectionContext, CorrectionEntity, CorrectionFilter,
    NewCorrectionMeta,
};
use crate::domain::model::auth::{CorrectionApprover, UserRoleEnum};
use crate::domain::repository::{Connection, Transaction, TransactionManager};
use crate::domain::user::User;
use crate::infra;
use crate::infra::error::InternalError;

mod model;
pub use model::*;

use super::error::Unauthorized;

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum Error {
    #[error(transparent)]
    Infra {
        #[backtrace]
        source: infra::Error,
    },
    #[error(transparent)]
    Unauthorized(
        #[from]
        #[backtrace]
        Unauthorized,
    ),
}

impl<E> From<E> for Error
where
    E: Into<infra::Error>,
{
    fn from(err: E) -> Self {
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
    ) -> Result<(), Error>
    where
        infra::Error: From<R::Error>,
    {
        self.repo.create(meta.into()).await?;
        Ok(())
    }

    pub async fn create2<T: CorrectionEntity>(
        &self,
        meta: impl Into<NewCorrectionMeta<T>>,
    ) -> Result<(), InternalError>
    where
        InternalError: From<R::Error>,
    {
        self.repo.create(meta.into()).await?;
        Ok(())
    }

    pub async fn upsert<T: CorrectionEntity>(
        &self,
        meta: NewCorrectionMeta<T>,
    ) -> Result<(), Error>
    where
        infra::Error: From<R::Error>,
    {
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
                Err(Unauthorized::new())?;
            }

            self.repo.create(meta).await?;
        } else {
            self.repo.update(prev_correction.id, meta).await?;
        }

        Ok(())
    }

    pub async fn upsert2<T: CorrectionEntity>(
        &self,
        meta: NewCorrectionMeta<T>,
    ) -> eros::UnionResult<(), (InternalError, Unauthorized)>
    where
        InternalError: From<R::Error>,
    {
        let prev_correction = self
            .repo
            .find_one(CorrectionFilter::latest(
                meta.entity_id,
                T::entity_type(),
            ))
            .await
            .map_err(InternalError::from)
            .union()?
            .expect("Correction should be founded");

        if prev_correction.status == CorrectionStatus::Pending {
            let is_author_or_admin = if meta
                .author
                .has_roles(&[UserRoleEnum::Admin, UserRoleEnum::Moderator])
            {
                true
            } else {
                self.repo
                    .is_author(&meta.author, &prev_correction)
                    .await
                    .map_err(InternalError::from)
                    .union()?
            };

            if !is_author_or_admin {
                Err(Unauthorized::new()).union()?;
            }

            self.repo.create(meta).await
        } else {
            self.repo.update(prev_correction.id, meta).await
        }
        .map_err(InternalError::from)
        .union()?;

        Ok(())
    }
}

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: correction::TxRepo + Transaction,
    infra::Error: From<R::Error> + From<TR::Error>,
{
    pub async fn approve<Ctx>(
        &self,
        correction_id: i32,
        user: User,
        context: Ctx,
    ) -> Result<(), Error>
    where
        Ctx: ApproveCorrectionContext,
        infra::Error: From<<Ctx::ArtistRepo as Connection>::Error>
            + From<<Ctx::ReleaseRepo as Connection>::Error>
            + From<<Ctx::SongRepo as Connection>::Error>
            + From<<Ctx::LabelRepo as Connection>::Error>
            + From<<Ctx::EventRepo as Connection>::Error>
            + From<<Ctx::TagRepo as Connection>::Error>
            + From<<Ctx::SongLyricsRepo as Connection>::Error>
            + From<<Ctx::CreditRoleRepo as Connection>::Error>,
    {
        let approver = CorrectionApprover::from_user(user)
            .ok_or_else(Unauthorized::new)?;

        let tx_repo = self.repo.begin().await?;

        tx_repo.approve(correction_id, approver, context).await?;

        tx_repo.commit().await?;

        Ok(())
    }
}
