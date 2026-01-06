use entity::enums::CorrectionStatus;

use crate::application::correction::Error as CorrectionError;
use crate::application::error::Unauthorized;
use crate::domain::correction::{
    CorrectionEntity, CorrectionFilter, NewCorrectionMeta, Repo as _,
    TxRepo as _,
};
use crate::domain::model::{CorrectionApprover, UserRoleEnum};
use crate::domain::user::User;
use crate::features::correction::repo;
use crate::infra;
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};
use crate::infra::error::Error as InfraError;

pub async fn approve(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), CorrectionError> {
    let approver =
        CorrectionApprover::from_user(user).ok_or_else(Unauthorized::new)?;
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;
    repo::approve(&tx_repo, correction_id, approver).await?;
    tx_repo.commit().await.map_err(infra::Error::from)?;
    Ok(())
}

pub async fn create<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<(), CorrectionError> {
    let _ = repo.create(meta.into()).await?;
    Ok(())
}

pub async fn create2<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<i32, InfraError> {
    let correction_id = repo.create(meta.into()).await?;
    Ok(correction_id)
}

pub async fn upsert<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<T>,
) -> Result<(), CorrectionError> {
    let prev_correction = repo
        .find_one(CorrectionFilter::latest(meta.entity_id, T::entity_type()))
        .await?
        .ok_or(CorrectionError::NotFound)?;

    if prev_correction.status == CorrectionStatus::Pending {
        let is_author_or_admin = if meta
            .author
            .has_roles(&[UserRoleEnum::Admin, UserRoleEnum::Moderator])
        {
            true
        } else {
            repo.is_author(&meta.author, &prev_correction).await?
        };

        if !is_author_or_admin {
            Err(Unauthorized::new())?;
        }

        let _ = repo.create(meta).await?;
    } else if prev_correction.status == CorrectionStatus::Approved {
        return Err(CorrectionError::AlreadyApproved);
    } else {
        repo.update(prev_correction.id, meta).await?;
    }

    Ok(())
}
