use chrono::Utc;
use entity::correction::{Column, Entity};
use entity::enums::{CorrectionStatus, CorrectionUserType, EntityType};
use entity::{
    correction as correction_entity, correction_revision, correction_user,
};
use fastrace::prelude::LocalSpan;
use infra_db::{SeaOrmRepository, SeaOrmTxRepo};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, PaginatorTrait, QueryFilter, QueryOrder, QueryTrait,
};

use super::ModerationError;
use crate::features::correction::{
    Correction, CorrectionEntity, CorrectionFilter, CorrectionFilterStatus,
    NewCorrectionMeta,
};
use crate::features::user::User;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(super) struct CorrectionApprover(pub User);

pub async fn find_one(
    db: &impl ConnectionTrait,
    filter: CorrectionFilter,
) -> Result<Option<Correction>, DatabaseError> {
    let ret = Entity::find()
        .filter(Column::EntityId.eq(filter.entity_id))
        .filter(Column::EntityType.eq(filter.entity_type))
        .apply_if(filter.status, |query, status| match status {
            CorrectionFilterStatus::Many(many) => {
                query.filter(Column::Status.is_in(many))
            }
            CorrectionFilterStatus::One(one) => {
                query.filter(Column::Status.eq(one))
            }
        })
        .order_by_desc(Column::CreatedAt)
        .one(db)
        .await
        .db_operation("find correction")?
        .map(|model| Correction {
            id: model.id,
            status: model.status,
            r#type: model.r#type,
            entity_id: model.entity_id,
            entity_type: model.entity_type,
            created_at: model.created_at,
            handled_at: model.handled_at,
        });
    Ok(ret)
}

pub async fn is_author(
    db: &impl ConnectionTrait,
    user: &User,
    correction: &Correction,
) -> Result<bool, DatabaseError> {
    let count = correction_user::Entity::find()
        .filter(correction_user::Column::CorrectionId.eq(correction.id))
        .filter(correction_user::Column::UserId.eq(user.id))
        .filter(
            correction_user::Column::UserType.eq(CorrectionUserType::Author),
        )
        .count(db)
        .await
        .db_operation("check correction author")?;
    Ok(count != 0)
}

pub async fn create(
    tx_repo: &SeaOrmTxRepo,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<i32, DatabaseError> {
    let new_correction = entity::correction::ActiveModel {
        id: NotSet,
        status: Set(meta.status),
        r#type: Set(meta.r#type),
        entity_type: Set(meta.entity_type()),
        entity_id: Set(meta.entity_id),
        created_at: NotSet,
        handled_at: NotSet,
    }
    .insert(tx_repo.conn())
    .await
    .db_operation("insert correction")?;

    let correction_id = new_correction.id;

    // TODO: remove dupelicate correction user table
    entity::correction_user::Model {
        correction_id,
        user_id: meta.author.id,
        user_type: CorrectionUserType::Author,
    }
    .into_active_model()
    .insert(tx_repo.conn())
    .await
    .db_operation("insert correction author")?;

    correction_revision::Model {
        correction_id,
        entity_history_id: meta.history_id,
        description: meta.description,
        author_id: meta.author.id,
    }
    .into_active_model()
    .insert(tx_repo.conn())
    .await
    .db_operation("insert correction revision")?;

    Ok(correction_id)
}

pub async fn update(
    tx_repo: &SeaOrmTxRepo,
    id: i32,
    meta: NewCorrectionMeta<impl CorrectionEntity>,
) -> Result<(), DatabaseError> {
    correction_revision::Model {
        correction_id: id,
        entity_history_id: meta.history_id,
        description: meta.description,
        author_id: meta.author.id,
    }
    .into_active_model()
    .insert(tx_repo.conn())
    .await
    .db_operation("insert correction revision")?;

    Ok(())
}

async fn find_correction_or_err(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
) -> Result<correction_entity::Model, ModerationError> {
    let correction = correction_entity::Entity::find_by_id(correction_id)
        .one(tx_repo.conn())
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.find_by_id",
                error:? = err;
                "correction repository operation failed"
            );
        })
        .db_operation("find correction")?;

    correction.ok_or(ModerationError::NotFound)
}

async fn insert_approver(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    approver_id: i32,
) -> Result<(), DatabaseError> {
    correction_user::Entity::insert(correction_user::ActiveModel {
        user_id: Set(approver_id),
        correction_id: Set(correction_id),
        user_type: Set(CorrectionUserType::Approver),
    })
    .exec(tx_repo.conn())
    .await
    .inspect_err(|err| {
        log::error!(
            target: "features.correction.repo",
            operation = "correction_user.insert_approver",
            error:? = err;
            "correction repository operation failed"
        );
    })
    .db_operation("insert correction approver")?;

    Ok(())
}

async fn update_correction_status(
    tx_repo: &SeaOrmTxRepo,
    correction: correction_entity::Model,
    status: CorrectionStatus,
) -> Result<correction_entity::Model, DatabaseError> {
    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(status);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model
        .update(tx_repo.conn())
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.update_status",
                error:? = err;
                "correction repository operation failed"
            );
        })
        .db_operation("update correction status")?;

    Ok(correction)
}

pub async fn find_pending_id(
    repo: &SeaOrmRepository,
    entity_id: i32,
    entity_type: EntityType,
) -> Result<Option<i32>, DatabaseError> {
    LocalSpan::add_properties(|| {
        [
            ("entity_id", entity_id.to_string()),
            ("entity_type", format!("{entity_type:?}")),
        ]
    });

    let model = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(entity_id))
        .filter(correction_entity::Column::EntityType.eq(entity_type))
        .filter(correction_entity::Column::Status.eq(CorrectionStatus::Pending))
        .order_by_desc(correction_entity::Column::CreatedAt)
        .one(&repo.conn)
        .await
        .inspect_err(|err| {
            log::error!(
                target: "features.correction.repo",
                operation = "correction.find_pending_id",
                error:? = err;
                "correction repository operation failed"
            );
        })
        .db_operation("find pending correction")?;

    Ok(model.map(|model| model.id))
}

async fn apply_correction_update(
    tx_repo: &SeaOrmTxRepo,
    correction: correction_entity::Model,
) -> Result<(), ModerationError> {
    let apply_update_res = match correction.entity_type {
        EntityType::Artist => {
            crate::features::artist::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Label => {
            crate::features::label::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Release => {
            crate::features::release::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Song => {
            crate::features::song::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::Tag => {
            crate::features::tag::repo::apply_update(correction, tx_repo.conn())
                .await
        }
        EntityType::Event => {
            crate::features::event::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::SongLyrics => {
            crate::features::song_lyrics::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
        EntityType::CreditRole => {
            crate::features::credit_role::repo::apply_update(
                correction,
                tx_repo.conn(),
            )
            .await
        }
    };

    apply_update_res.db_operation("apply correction update")?;
    Ok(())
}

pub async fn approve(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), ModerationError> {
    LocalSpan::add_properties(|| {
        [
            ("correction_id", correction_id.to_string()),
            ("approver_id", approver.id.to_string()),
        ]
    });

    let correction = find_correction_or_err(tx_repo, correction_id).await?;
    if correction.status != CorrectionStatus::Pending {
        return Err(ModerationError::AlreadyHandled);
    }

    LocalSpan::add_properties(|| {
        [
            ("entity_id", correction.entity_id.to_string()),
            ("entity_type", format!("{:?}", correction.entity_type)),
        ]
    });

    insert_approver(tx_repo, correction_id, approver.id).await?;

    let correction = update_correction_status(
        tx_repo,
        correction,
        CorrectionStatus::Approved,
    )
    .await?;

    apply_correction_update(tx_repo, correction).await?;

    Ok(())
}

pub async fn reject(
    tx_repo: &SeaOrmTxRepo,
    correction_id: i32,
    CorrectionApprover(approver): CorrectionApprover,
) -> Result<(), ModerationError> {
    LocalSpan::add_properties(|| {
        [
            ("correction_id", correction_id.to_string()),
            ("approver_id", approver.id.to_string()),
        ]
    });

    let correction = find_correction_or_err(tx_repo, correction_id).await?;
    if correction.status != CorrectionStatus::Pending {
        return Err(ModerationError::AlreadyHandled);
    }

    LocalSpan::add_properties(|| {
        [
            ("entity_id", correction.entity_id.to_string()),
            ("entity_type", format!("{:?}", correction.entity_type)),
        ]
    });

    insert_approver(tx_repo, correction_id, approver.id).await?;

    let _ = update_correction_status(
        tx_repo,
        correction,
        CorrectionStatus::Rejected,
    )
    .await?;

    Ok(())
}
