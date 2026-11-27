use auth_core::permission::{Permission, user_has_permission};
use entity::correction;
use entity::enums::EntityType;
use infra_db::{DatabaseTransaction, SeaOrmRepository, SeaOrmTxRepo};
use notification_core::{CorrectionModerationAction, NotificationRecipients};

use super::{ModerationError, SubmissionError, repo};
use crate::features::correction::{
    CorrectionEntity, CorrectionFilter, CorrectionSubmitResult,
    NewCorrectionMeta,
};
use crate::features::song_lyrics::moderation::{self, ApplyEditError};
use crate::features::user::User;
use crate::features::user_event::{UserEvent, UserEventSender};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use crate::shared::error::InternalError;

#[cfg(all(test, feature = "integration-test"))]
mod event_moderation_tests;
#[cfg(all(test, feature = "integration-test"))]
mod observation_tests;

async fn latest_history_id(
    tx: &DatabaseTransaction,
    correction_id: i32,
) -> Result<i32, DatabaseError> {
    let revision = correction_core::latest_revision(tx, correction_id)
        .await
        .db_context("load correction revision to apply")?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction_id,
        })
        .db_context("resolve history to apply")?;
    Ok(revision.entity_history_id)
}

async fn apply_correction_update(
    tx: &DatabaseTransaction,
    correction: correction::Model,
) -> Result<(), ModerationError> {
    const OPERATION: &str = "correction.apply_update";
    infra_db::trace(OPERATION, async {
        let history_id = latest_history_id(tx, correction.id)
            .await
            .map_err(|error| error.context(OPERATION))?;
        let entity_id = correction.entity_id;
        let apply_result = match correction.entity_type {
            EntityType::Artist => {
                artist_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::Label => {
                label_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::Release => {
                release_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::Song => {
                song_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::Tag => {
                tag_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::Event => {
                event_repo::apply_history(tx, entity_id, history_id).await
            }
            EntityType::SongLyrics => {
                match moderation::apply_edit(tx, entity_id, history_id).await {
                    Ok(()) => Ok(()),
                    Err(ApplyEditError::Database(error)) => Err(error),
                    Err(error @ ApplyEditError::IdentityMismatch { .. }) => {
                        return Err(InternalError::new(error).into());
                    }
                }
            }
            EntityType::CreditRole => {
                credit_role_repo::apply_history(tx, entity_id, history_id).await
            }
        };

        apply_result
            .db_context("apply correction update")
            .map_err(|error| error.context(OPERATION))?;
        Ok(())
    })
    .await
}

#[fastrace::trace(name = "correction.service.approve")]
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
        .db_context("begin approve correction transaction")?;

    let tx = tx_repo.conn();
    let correction =
        correction_core::approve(tx, correction_id, actor_user_id).await?;
    apply_correction_update(tx, correction).await?;

    let notification_recipients = correction_notification::create_moderated(
        tx,
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

#[fastrace::trace(name = "correction.service.reject")]
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
        .db_context("begin reject correction transaction")?;

    let tx = tx_repo.conn();
    correction_core::reject(tx, correction_id, actor_user_id).await?;

    let notification_recipients = correction_notification::create_moderated(
        tx,
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
    .db_context("subscribe correction author")?;

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

impl CorrectionUpsertResult {
    pub(crate) fn publish_and_respond(
        self,
        entity_id: i32,
        user_events: &UserEventSender,
    ) -> CorrectionSubmitResult {
        match self {
            Self::Submitted {
                correction_id,
                notification_recipients,
            } => {
                user_events.publish(
                    UserEvent::NotificationInboxUpdated,
                    notification_recipients.user_ids,
                );
                CorrectionSubmitResult::submitted(correction_id, entity_id)
            }
            Self::Conflict { correction_id } => {
                CorrectionSubmitResult::conflict(correction_id, entity_id)
            }
        }
    }
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

#[fastrace::trace(name = "correction.service.upsert")]
async fn upsert_in_transaction<T: CorrectionEntity + Send + Sync>(
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
            .db_context("subscribe correction author")?;

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
            .db_context("check correction manage permission")?
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
            .db_context("subscribe correction author")?;

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

pub async fn upsert<T: CorrectionEntity + Send + Sync>(
    repo: SeaOrmTxRepo,
    meta: NewCorrectionMeta<T>,
    mode: CorrectionUpsertMode,
) -> Result<CorrectionUpsertResult, SubmissionError> {
    let result = upsert_in_transaction(&repo, meta, mode).await?;

    match &result {
        CorrectionUpsertResult::Submitted { .. } => repo.commit().await?,
        // The caller already wrote a candidate history in this transaction.
        CorrectionUpsertResult::Conflict { .. } => repo.rollback().await?,
    }

    Ok(result)
}
