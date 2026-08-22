use auth_core::permission::{Permission, user_has_permission};
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};
use notification_core::{CorrectionModerationAction, NotificationRecipients};

use super::{ModerationError, SubmissionError, repo};
use crate::features::correction::repo::CorrectionApprover;
use crate::features::correction::{
    CorrectionEntity, CorrectionFilter, NewCorrectionMeta,
};
use crate::features::user::User;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::DatabaseResultExt;

pub async fn approve(
    repo: &SeaOrmRepository,
    user_events: UserEventSender,
    correction_id: i32,
    user: User,
) -> Result<(), ModerationError> {
    let actor_user_id = user.id;
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin approve correction transaction")?;

    repo::approve(&tx_repo, correction_id, CorrectionApprover(user)).await?;

    let notification_recipients = correction_notification::create_moderated(
        tx_repo.conn(),
        actor_user_id,
        correction_id,
        CorrectionModerationAction::Approved,
    )
    .await?;

    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;
    user_events.publish(
        UserEvent::NotificationInboxUpdated,
        notification_recipients.user_ids,
    );

    Ok(())
}

pub async fn reject(
    repo: &SeaOrmRepository,
    user_events: UserEventSender,
    correction_id: i32,
    user: User,
) -> Result<(), ModerationError> {
    let actor_user_id = user.id;
    let tx_repo = repo
        .begin_tx()
        .await
        .db_operation("begin reject correction transaction")?;

    repo::reject(&tx_repo, correction_id, CorrectionApprover(user)).await?;

    let notification_recipients = correction_notification::create_moderated(
        tx_repo.conn(),
        actor_user_id,
        correction_id,
        CorrectionModerationAction::Rejected,
    )
    .await?;

    tx_repo
        .commit()
        .await
        .map_err(crate::infra::database::error::DatabaseError::from)?;
    user_events.publish(
        UserEvent::NotificationInboxUpdated,
        notification_recipients.user_ids,
    );

    Ok(())
}

pub async fn create<T: CorrectionEntity + Send>(
    repo: &SeaOrmTxRepo,
    meta: impl Into<NewCorrectionMeta<T>> + Send,
) -> Result<i32, SubmissionError> {
    let meta = meta.into();
    let actor_user_id = meta.author.id;

    let correction_id = repo::create_approved(repo, meta).await?;

    correction_subscription::subscribe(
        repo.conn(),
        actor_user_id,
        correction_id,
    )
    .await
    .db_operation("subscribe correction author")?;

    Ok(correction_id)
}

pub enum CorrectionUpsertMode {
    Create,
    Update { correction_id: i32 },
}

pub enum CorrectionUpsertResult {
    Submitted {
        correction_id: i32,
        notification_recipients: NotificationRecipients,
    },
    Conflict {
        correction_id: i32,
    },
}

async fn ensure_entity_exists<T: CorrectionEntity + Send + Sync>(
    repo: &SeaOrmTxRepo,
    entity_id: i32,
) -> Result<(), SubmissionError> {
    let _ = repo::find_one(
        repo.conn(),
        CorrectionFilter::latest(entity_id, T::entity_type()),
    )
    .await?
    .ok_or(SubmissionError::NotFound)?;

    Ok(())
}

pub async fn upsert<T: CorrectionEntity + Send + Sync>(
    repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<T>,
    mode: CorrectionUpsertMode,
) -> Result<CorrectionUpsertResult, SubmissionError> {
    let result = match mode {
        CorrectionUpsertMode::Create => {
            ensure_entity_exists::<T>(repo, meta.entity_id).await?;

            let actor_user_id = meta.author.id;
            let correction_id =
                match repo::create_pending(repo.conn(), meta).await? {
                    repo::CreateResult::Created(correction_id) => correction_id,
                    repo::CreateResult::Conflict(correction_id) => {
                        return Ok(CorrectionUpsertResult::Conflict {
                            correction_id,
                        });
                    }
                };
            correction_subscription::subscribe(
                repo.conn(),
                actor_user_id,
                correction_id,
            )
            .await
            .db_operation("subscribe correction author")?;

            let notification_recipients =
                correction_notification::create_review_requested(
                    repo.conn(),
                    actor_user_id,
                    correction_id,
                )
                .await?;

            CorrectionUpsertResult::Submitted {
                correction_id,
                notification_recipients,
            }
        }
        CorrectionUpsertMode::Update { correction_id } => {
            ensure_entity_exists::<T>(repo, meta.entity_id).await?;

            let pending_correction = repo::lock_pending_correction(
                repo,
                meta.entity_id,
                T::entity_type(),
            )
            .await?;

            let Some(pending_correction) = pending_correction else {
                return Err(SubmissionError::NotFound);
            };

            if pending_correction.id != correction_id {
                return Ok(CorrectionUpsertResult::Conflict {
                    correction_id: pending_correction.id,
                });
            }

            let can_update = user_has_permission(
                repo.conn(),
                meta.author.id,
                Permission::CorrectionManage,
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

            let actor_user_id = meta.author.id;
            let entity_history_id = meta.history_id;

            repo::update(repo, correction_id, meta).await?;
            correction_subscription::subscribe(
                repo.conn(),
                actor_user_id,
                correction_id,
            )
            .await
            .db_operation("subscribe correction author")?;

            let notification_recipients =
                correction_notification::create_updated(
                    repo.conn(),
                    actor_user_id,
                    correction_id,
                    entity_history_id,
                )
                .await?;

            CorrectionUpsertResult::Submitted {
                correction_id,
                notification_recipients,
            }
        }
    };

    Ok(result)
}
