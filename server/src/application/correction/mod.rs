use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    self, ApproveCorrectionContext, CorrectionEntity, CorrectionFilter,
    NewCorrectionMeta,
};
use crate::domain::model::auth::{CorrectionApprover, UserRoleEnum};
use crate::domain::repository::{Connection, Transaction, TransactionManager};
use crate::domain::user::User;

mod model;
pub use model::*;

use super::error::Unauthorized;

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
    Infra(crate::infra::Error),
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
    crate::infra::Error: From<R::Error>,
{
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }

    // TODO: Add self approval
    pub async fn create<T: CorrectionEntity>(
        &self,
        meta: impl Into<NewCorrectionMeta<T>>,
    ) -> Result<(), Error> {
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

impl<R, TR> Service<R>
where
    R: TransactionManager<TransactionRepository = TR>,
    TR: correction::TxRepo + Transaction,
    crate::infra::Error: From<R::Error> + From<TR::Error>,
{
    pub async fn approve<Ctx>(
        &self,
        correction_id: i32,
        user: User,
        context: Ctx,
    ) -> Result<(), Error>
    where
        Ctx: ApproveCorrectionContext,
        crate::infra::Error: From<<Ctx::ArtistRepo as Connection>::Error>
            + From<<Ctx::ReleaseRepo as Connection>::Error>
            + From<<Ctx::SongRepo as Connection>::Error>
            + From<<Ctx::LabelRepo as Connection>::Error>
            + From<<Ctx::EventRepo as Connection>::Error>
            + From<<Ctx::TagRepo as Connection>::Error>
            + From<<Ctx::SongLyricsRepo as Connection>::Error>,
    {
        let approver =
            CorrectionApprover::from_user(user).ok_or(Unauthorized)?;

        let tx_repo = self.repo.begin().await?;

        tx_repo.approve(correction_id, approver, context).await?;

        tx_repo.commit().await?;

        Ok(())
    }
}
