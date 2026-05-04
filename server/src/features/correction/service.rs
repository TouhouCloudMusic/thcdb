use super::repo;
use crate::application::correction::Error as CorrectionError;
use crate::application::error::Unauthorized;
use crate::domain::correction::{
    CorrectionEntity, CorrectionFilter, NewCorrectionMeta, Repo as _,
    TxRepo as _,
};
use crate::domain::model::{CorrectionApprover, CorrectionManage};
use crate::domain::user::User;
use crate::infra;
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};
use crate::infra::error::Error as InfraError;

pub async fn approve(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), CorrectionError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;
    repo::approve(&tx_repo, correction_id, CorrectionApprover(user)).await?;
    tx_repo.commit().await.map_err(infra::Error::from)?;
    Ok(())
}

pub async fn reject(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), CorrectionError> {
    let tx_repo = repo.begin_tx().await.map_err(infra::Error::from)?;
    repo::reject(&tx_repo, correction_id, CorrectionApprover(user)).await?;
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
    let pending_correction = repo
        .find_one(CorrectionFilter::pending(meta.entity_id, T::entity_type()))
        .await?;

    if let Some(prev_correction) = pending_correction {
        let can_update_pending = crate::infra::authz::user_has_permission::<
            CorrectionManage,
        >(repo.conn(), meta.author.id)
        .await?
            || repo.is_author(&meta.author, &prev_correction).await?;

        if !can_update_pending {
            Err(Unauthorized::new())?;
        }
    }

    let _ = repo.create(meta).await?;

    Ok(())
}
