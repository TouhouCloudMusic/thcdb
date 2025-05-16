use entity::enums::CorrectionStatus;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::correction::{
    self, CorrectionEntity, CorrectionFilter, NewCorrectionMeta,
};
use crate::domain::model::auth::UserRoleEnum;
use crate::error::{InfraError, Unauthorized};

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

    pub async fn upsert_correction<T: CorrectionEntity>(
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
