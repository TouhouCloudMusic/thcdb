use super::{ModerationError, SubmissionError, repo};
use crate::domain::correction::{
    CorrectionEntity, CorrectionFilter, NewCorrectionMeta, Repo as _,
    TxRepo as _,
};
use crate::domain::model::{CorrectionApprover, CorrectionManage};
use crate::domain::user::User;
use crate::infra::database::error::DatabaseResultExt;
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};

pub async fn approve(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), ModerationError> {
    let tx_repo = repo
        .begin_tx()
        .await
        .with_operation("begin approve correction transaction")?;
    repo::approve(&tx_repo, correction_id, CorrectionApprover(user)).await?;
    tx_repo.commit().await?;
    Ok(())
}

pub async fn reject(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), ModerationError> {
    let tx_repo = repo
        .begin_tx()
        .await
        .with_operation("begin reject correction transaction")?;
    repo::reject(&tx_repo, correction_id, CorrectionApprover(user)).await?;
    tx_repo.commit().await?;
    Ok(())
}

pub async fn create<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<(), SubmissionError> {
    let _ = repo.create(meta.into()).await?;
    Ok(())
}

pub async fn create2<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<i32, SubmissionError> {
    let correction_id = repo.create(meta.into()).await?;
    Ok(correction_id)
}

pub async fn upsert<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<T>,
) -> Result<(), SubmissionError> {
    let pending_correction = repo
        .find_one(CorrectionFilter::pending(meta.entity_id, T::entity_type()))
        .await?;

    if let Some(prev_correction) = pending_correction {
        let can_update_pending = crate::infra::authz::user_has_permission::<
            CorrectionManage,
        >(repo.conn(), meta.author.id)
        .await
        .with_operation("check correction manage permission")?
            || repo.is_author(&meta.author, &prev_correction).await?;

        if !can_update_pending {
            return Err(SubmissionError::PermissionDenied);
        }
    }

    let _ = repo.create(meta).await?;

    Ok(())
}
