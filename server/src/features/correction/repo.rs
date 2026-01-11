use chrono::Utc;
use entity::enums::{CorrectionStatus, CorrectionUserType, EntityType};
use entity::{correction as correction_entity, correction_user};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder,
};
use tracing::Instrument;

use crate::domain::model::CorrectionApprover;
use crate::infra;
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};

async fn find_correction_or_err(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
) -> Result<correction_entity::Model, infra::Error> {
    let correction = correction_entity::Entity::find_by_id(correction_id)
        .one(tx_repo.conn())
        .await
        .inspect_err(|err| {
            tracing::error!(
                ?err,
                operation = "correction.find_by_id",
                "Correction Repo: operation failed"
            );
        })?;

    correction.ok_or_else(|| {
        infra::Error::custom(&format_args!(
            "Correction {correction_id} not found, but it should not happen"
        ))
    })
}

async fn insert_approver(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    approver_id: i32,
) -> Result<(), infra::Error> {
    correction_user::Entity::insert(correction_user::ActiveModel {
        user_id: Set(approver_id),
        correction_id: Set(correction_id),
        user_type: Set(CorrectionUserType::Approver),
    })
    .exec(tx_repo.conn())
    .await
    .inspect_err(|err| {
        tracing::error!(
            ?err,
            operation = "correction_user.insert_approver",
            "Correction Repo: operation failed"
        );
    })?;

    Ok(())
}

async fn update_correction_status(
    tx_repo: &SeaOrmTxRepo,
    correction: correction_entity::Model,
    status: CorrectionStatus,
) -> Result<correction_entity::Model, infra::Error> {
    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(status);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model
        .update(tx_repo.conn())
        .await
        .inspect_err(|err| {
            tracing::error!(
                ?err,
                operation = "correction.update_status",
                "Correction Repo: operation failed"
            );
        })?;

    Ok(correction)
}

pub async fn find_pending_id(
    repo: &SeaOrmRepository,
    entity_id: i32,
    entity_type: EntityType,
) -> Result<Option<i32>, infra::Error> {
    let span = tracing::debug_span!(
        "correction.find_pending_id",
        entity_id,
        entity_type = ?entity_type
    );

    let model = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(entity_id))
        .filter(correction_entity::Column::EntityType.eq(entity_type))
        .filter(correction_entity::Column::Status.eq(CorrectionStatus::Pending))
        .order_by_desc(correction_entity::Column::CreatedAt)
        .one(&repo.conn)
        .instrument(span)
        .await
        .inspect_err(|err| {
            tracing::error!(
                ?err,
                operation = "correction.find_pending_id",
                "Correction Repo: operation failed"
            );
        })?;

    Ok(model.map(|model| model.id))
}

pub async fn approve(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), infra::Error> {
    let span = tracing::info_span!(
        "correction.approve",
        correction_id,
        approver_id = approver.id,
        entity_id = tracing::field::Empty,
        entity_type = tracing::field::Empty
    );

    async move {
        let correction = find_correction_or_err(tx_repo, correction_id).await?;
        let current_span = tracing::Span::current();
        current_span.record("entity_id", correction.entity_id);
        current_span.record(
            "entity_type",
            tracing::field::debug(correction.entity_type),
        );

        insert_approver(tx_repo, correction_id, approver.id).await?;

        let correction = update_correction_status(
            tx_repo,
            correction,
            CorrectionStatus::Approved,
        )
        .await?;

        let apply_update_res = match correction.entity_type {
            EntityType::Artist => {
                crate::infra::database::sea_orm::artist::impls::apply_update(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::Label => {
                crate::infra::database::sea_orm::label::impls::apply_update(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::Release => {
                crate::infra::database::sea_orm::release::tx_repo::apply_update(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::Song => {
                crate::infra::database::sea_orm::song::impls::apply_update(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::Tag => {
                crate::infra::database::sea_orm::tag::impls::apply_correction(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::Event => {
                crate::infra::database::sea_orm::event::apply_correction(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::SongLyrics => {
                crate::infra::database::sea_orm::song_lyrics::apply_update_impl(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
            EntityType::CreditRole => {
                crate::infra::database::sea_orm::credit_role::apply_update_impl(
                    correction,
                    tx_repo.conn(),
                )
                .await
            }
        };

        apply_update_res.inspect_err(|err| {
            tracing::error!(
                ?err,
                operation = "correction.apply_update",
                "Correction Repo: operation failed"
            );
        })?;

        Ok(())
    }
    .instrument(span)
    .await
}

pub async fn reject(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), infra::Error> {
    let span = tracing::info_span!(
        "correction.reject",
        correction_id,
        approver_id = approver.id,
        entity_id = tracing::field::Empty,
        entity_type = tracing::field::Empty
    );

    async move {
        let correction = find_correction_or_err(tx_repo, correction_id).await?;
        let current_span = tracing::Span::current();
        current_span.record("entity_id", correction.entity_id);
        current_span.record(
            "entity_type",
            tracing::field::debug(correction.entity_type),
        );

        insert_approver(tx_repo, correction_id, approver.id).await?;

        let _ = update_correction_status(
            tx_repo,
            correction,
            CorrectionStatus::Rejected,
        )
        .await?;

        Ok(())
    }
    .instrument(span)
    .await
}
