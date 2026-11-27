mod query;

use chrono::Utc;
use entity::enums::{CorrectionStatus, CorrectionUserType};
use entity::{correction, correction_revision, correction_user};
use fastrace::prelude::LocalSpan;
use infra_db::DatabaseTransaction;
use infra_db::error::{DatabaseError, DatabaseResultExt};
pub use query::{
    CorrectionSortField, correction_exists, correction_sorted_entity_ids,
    find_base, find_by_id, find_correction, find_pending_history_id,
    list_approved_corrections,
};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    IntoActiveModel, QueryFilter, QueryOrder, QuerySelect,
};

pub async fn latest_revision(
    db: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<Option<correction_revision::Model>, DbErr> {
    infra_db::trace("correction.latest_revision", async {
        correction_revision::Entity::find()
            .filter(correction_revision::Column::CorrectionId.eq(correction_id))
            .order_by_desc(correction_revision::Column::EntityHistoryId)
            .one(db)
            .await
    })
    .await
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum ModerationError {
    #[display("Correction not found")]
    NotFound,
    #[display("Correction already handled")]
    AlreadyHandled,
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

#[infra_db::observe("correction.lock")]
async fn lock_correction(
    tx: &DatabaseTransaction,
    correction_id: i32,
) -> Result<Option<correction::Model>, DatabaseError> {
    LocalSpan::add_property(|| ("correction_id", correction_id.to_string()));

    let correction = correction::Entity::find_by_id(correction_id)
        .lock_exclusive()
        .one(tx)
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.lock_by_id",
                error:% = err;
                "correction repository operation failed"
            );
        })
        .db_context("lock correction")?;

    Ok(correction)
}

async fn lock_pending(
    tx: &DatabaseTransaction,
    correction_id: i32,
) -> Result<correction::Model, ModerationError> {
    let correction = lock_correction(tx, correction_id)
        .await?
        .ok_or(ModerationError::NotFound)?;
    if correction.status != CorrectionStatus::Pending {
        return Err(ModerationError::AlreadyHandled);
    }
    Ok(correction)
}

#[infra_db::observe("correction.insert_approver")]
async fn insert_approver(
    tx: &DatabaseTransaction,
    correction_id: i32,
    approver_id: i32,
) -> Result<(), DatabaseError> {
    correction_user::Entity::insert(correction_user::ActiveModel {
        user_id: Set(approver_id),
        correction_id: Set(correction_id),
        user_type: Set(CorrectionUserType::Approver),
    })
    .exec(tx)
    .await
    .inspect_err(|err| {
        log::error!(
            target: "features.correction.repo",
            operation = "correction_user.insert_approver",
            error:% = err;
            "correction repository operation failed"
        );
    })
    .db_context("insert correction approver")?;

    Ok(())
}

#[infra_db::observe("correction.update_status")]
async fn update_correction_status(
    tx: &DatabaseTransaction,
    correction: correction::Model,
    status: CorrectionStatus,
) -> Result<correction::Model, DatabaseError> {
    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(status);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model
        .update(tx)
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.update_status",
                error:% = err;
                "correction repository operation failed"
            );
        })
        .db_context("update correction status")?;

    Ok(correction)
}

fn add_moderation_span_properties(
    correction: &correction::Model,
    approver_id: i32,
) {
    LocalSpan::add_properties(|| {
        [
            ("correction_id", correction.id.to_string()),
            ("approver_id", approver_id.to_string()),
            ("entity_id", correction.entity_id.to_string()),
            ("entity_type", format!("{:?}", correction.entity_type)),
        ]
    });
}

#[infra_db::observe("correction.approve")]
async fn record_approval(
    tx: &DatabaseTransaction,
    correction: correction::Model,
    approver_id: i32,
) -> Result<correction::Model, DatabaseError> {
    add_moderation_span_properties(&correction, approver_id);
    insert_approver(tx, correction.id, approver_id).await?;

    let correction =
        update_correction_status(tx, correction, CorrectionStatus::Approved)
            .await?;
    Ok(correction)
}

#[infra_db::observe("correction.reject")]
async fn record_rejection(
    tx: &DatabaseTransaction,
    correction: correction::Model,
    approver_id: i32,
) -> Result<(), DatabaseError> {
    add_moderation_span_properties(&correction, approver_id);
    insert_approver(tx, correction.id, approver_id).await?;
    update_correction_status(tx, correction, CorrectionStatus::Rejected)
        .await?;
    Ok(())
}

/// Locks a pending correction and records approval without committing `tx`.
pub async fn approve(
    tx: &DatabaseTransaction,
    correction_id: i32,
    approver_id: i32,
) -> Result<correction::Model, ModerationError> {
    let correction = lock_pending(tx, correction_id).await?;
    Ok(record_approval(tx, correction, approver_id).await?)
}

/// Locks a pending correction and records rejection without committing `tx`.
pub async fn reject(
    tx: &DatabaseTransaction,
    correction_id: i32,
    approver_id: i32,
) -> Result<(), ModerationError> {
    let correction = lock_pending(tx, correction_id).await?;
    record_rejection(tx, correction, approver_id).await?;
    Ok(())
}
