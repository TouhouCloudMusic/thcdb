use chrono::Utc;
use entity::enums::{CorrectionStatus, CorrectionUserType, EntityType};
use entity::{correction as correction_entity, correction_user};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder,
};

use crate::domain::model::CorrectionApprover;
use crate::infra;
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};

pub async fn find_pending_id(
    repo: &SeaOrmRepository,
    entity_id: i32,
    entity_type: EntityType,
) -> Result<Option<i32>, infra::Error> {
    let model = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(entity_id))
        .filter(correction_entity::Column::EntityType.eq(entity_type))
        .filter(correction_entity::Column::Status.eq(CorrectionStatus::Pending))
        .order_by_desc(correction_entity::Column::CreatedAt)
        .one(&repo.conn)
        .await
        .map_err(infra::Error::from)?;

    Ok(model.map(|model| model.id))
}

pub async fn approve(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), infra::Error> {
    let correction = correction_entity::Entity::find_by_id(correction_id)
        .one(tx_repo.conn())
        .await?
        .ok_or_else(|| {
            infra::Error::custom(
                &"Correction not found, but it should not happen",
            )
        })?;

    correction_user::Entity::insert(correction_user::ActiveModel {
        user_id: Set(approver.id),
        correction_id: Set(correction_id),
        user_type: Set(CorrectionUserType::Approver),
    })
    .exec(tx_repo.conn())
    .await?;

    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(CorrectionStatus::Approved);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model.update(tx_repo.conn()).await?;

    match correction.entity_type {
        EntityType::Artist => {
            crate::infra::database::sea_orm::artist::impls::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::Label => {
            crate::infra::database::sea_orm::label::impls::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::Release => {
            crate::infra::database::sea_orm::release::tx_repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::Song => {
            crate::infra::database::sea_orm::song::impls::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::Tag => {
            crate::infra::database::sea_orm::tag::impls::apply_correction(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::Event => {
            crate::infra::database::sea_orm::event::apply_correction(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::SongLyrics => {
            crate::infra::database::sea_orm::song_lyrics::apply_update_impl(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
        EntityType::CreditRole => {
            crate::infra::database::sea_orm::credit_role::apply_update_impl(
                correction,
                tx_repo.conn(),
            )
            .await?;
        }
    }

    Ok(())
}
