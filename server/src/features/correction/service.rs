use infra_db::{SeaOrmRepository, SeaOrmTxRepo};

use super::{ModerationError, SubmissionError, repo};
use crate::features::auth::PermissionName;
use crate::features::correction::repo::CorrectionApprover;
use crate::features::correction::{
    CorrectionEntity, CorrectionFilter, NewCorrectionMeta,
};
use crate::features::user::User;
use crate::infra::database::error::DatabaseResultExt;

pub async fn approve(
    repo: &SeaOrmRepository,
    correction_id: i32,
    user: User,
) -> Result<(), ModerationError> {
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin approve correction transaction")?;
    repo::approve(&tx_repo, correction_id, CorrectionApprover(user)).await?;
    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;
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
        .db_operation("begin reject correction transaction")?;
    repo::reject(&tx_repo, correction_id, CorrectionApprover(user)).await?;
    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;
    Ok(())
}

pub async fn create<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<i32, SubmissionError> {
    let correction_id = repo::create(repo, meta.into()).await?;
    Ok(correction_id)
}

pub enum CorrectionUpsertMode {
    Create,
    Update { correction_id: i32 },
}

pub enum CorrectionUpsertResult {
    Submitted { correction_id: i32 },
    Conflict { correction_id: i32 },
}

pub async fn find_create_conflict<T: CorrectionEntity + Send + Sync>(
    repo: &SeaOrmTxRepo,
    entity_id: i32,
) -> Result<Option<i32>, SubmissionError> {
    let _ = repo::find_one(
        repo.conn(),
        CorrectionFilter::latest(entity_id, T::entity_type()),
    )
    .await?
    .ok_or(SubmissionError::NotFound)?;

    Ok(repo::find_one(
        repo.conn(),
        CorrectionFilter::pending(entity_id, T::entity_type()),
    )
    .await?
    .map(|pending_correction| pending_correction.id))
}

pub async fn find_create_conflict_for_mode<
    T: CorrectionEntity + Send + Sync,
>(
    repo: &SeaOrmTxRepo,
    entity_id: i32,
    mode: &CorrectionUpsertMode,
) -> Result<Option<i32>, SubmissionError> {
    match mode {
        CorrectionUpsertMode::Create => {
            find_create_conflict::<T>(repo, entity_id).await
        }
        CorrectionUpsertMode::Update { .. } => Ok(None),
    }
}

pub async fn upsert<T: CorrectionEntity + Send + Sync>(
    repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<T>,
    mode: CorrectionUpsertMode,
) -> Result<CorrectionUpsertResult, SubmissionError> {
    let result = match mode {
        CorrectionUpsertMode::Create => {
            if let Some(correction_id) =
                find_create_conflict::<T>(repo, meta.entity_id).await?
            {
                return Ok(CorrectionUpsertResult::Conflict { correction_id });
            }

            CorrectionUpsertResult::Submitted {
                correction_id: repo::create(repo, meta).await?,
            }
        }
        CorrectionUpsertMode::Update { correction_id } => {
            // Guard: ensure the entity was created through the correction system
            // (at least one prior correction must exist for this entity)
            let _ = repo::find_one(
                repo.conn(),
                CorrectionFilter::latest(meta.entity_id, T::entity_type()),
            )
            .await?
            .ok_or(SubmissionError::NotFound)?;

            let pending_correction = repo::find_one(
                repo.conn(),
                CorrectionFilter::pending(meta.entity_id, T::entity_type()),
            )
            .await?;

            let Some(pending_correction) = pending_correction else {
                return Err(SubmissionError::PendingCorrectionConflict {
                    correction_id,
                });
            };

            if pending_correction.id != correction_id {
                return Err(SubmissionError::PendingCorrectionConflict {
                    correction_id: pending_correction.id,
                });
            }

            let can_update = crate::infra::authz::user_has_permission(
                repo.conn(),
                meta.author.id,
                PermissionName::CorrectionManage,
            )
            .await
            .db_operation("check correction manage permission")?
                || repo::is_author(
                    repo.conn(),
                    &meta.author,
                    &pending_correction,
                )
                .await?;

            if !can_update {
                return Err(SubmissionError::PermissionDenied);
            }

            repo::update(repo, correction_id, meta).await?;
            CorrectionUpsertResult::Submitted { correction_id }
        }
    };

    Ok(result)
}
