use std::future::Future;

use bon::builder;
use chrono::{DateTime, FixedOffset, Utc};
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
};
use entity::{correction, correction_revision, correction_user};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityName, EntityOrSelect, EntityTrait, IntoActiveModel, QueryFilter,
    QueryOrder,
};
use utils::validate_entity_type;

use crate::error::RepositoryError;

type CorrectionResult = Result<correction::Model, DbErr>;

pub async fn find_by_id<C: ConnectionTrait>(
    correction_id: i32,
    db: &C,
) -> Result<correction::Model, RepositoryError> {
    correction::Entity::find_by_id(correction_id)
        .one(db)
        .await?
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: correction::Entity.table_name(),
        })
}

pub async fn find_by_id_with_type<C: ConnectionTrait>(
    correction_id: i32,
    entity_type: EntityType,
    db: &C,
) -> Result<correction::Model, RepositoryError> {
    find_by_id(correction_id, db).await.and_then(|x| {
        validate_entity_type(entity_type, x.entity_type)?;

        Ok(x)
    })
}

pub async fn find_latest(
    entity_id: i32,
    entity_type: EntityType,
    db: &impl ConnectionTrait,
) -> Result<correction::Model, RepositoryError> {
    correction::Entity::find()
        .filter(correction::Column::EntityId.eq(entity_id))
        .filter(correction::Column::EntityType.eq(entity_type))
        .order_by_desc(correction::Column::Id)
        .one(db)
        .await?
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: correction::Entity.table_name(),
        })
}

#[builder]
pub async fn create<C: ConnectionTrait>(
    author_id: i32,
    entity_type: EntityType,
    entity_id: i32,
    status: CorrectionStatus,
    r#type: CorrectionType,
    #[builder(into)] created_at: Option<DateTime<FixedOffset>>,
    db: &C,
) -> CorrectionResult {
    let result = correction::ActiveModel {
        id: NotSet,
        status: Set(status),
        r#type: Set(r#type),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
        created_at: created_at.map_or(NotSet, Set),
        handled_at: NotSet,
    }
    .insert(db)
    .await?;

    correction_user::ActiveModel {
        correction_id: Set(result.id),
        user_id: Set(author_id),
        user_type: Set(CorrectionUserType::Author),
    }
    .insert(db)
    .await?;

    Ok(result)
}

#[builder]
pub async fn create_self_approval(
    author_id: i32,
    entity_type: EntityType,
    entity_id: i32,
    db: &DatabaseTransaction,
) -> Result<correction::Model, DbErr> {
    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Create),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
        created_at: NotSet,
        handled_at: NotSet,
    }
    .insert(db)
    .await?;

    correction_user::Entity::insert_many(
        [CorrectionUserType::Author, CorrectionUserType::Approver]
            .into_iter()
            .map(|r#type| correction_user::ActiveModel {
                correction_id: Set(correction.id),
                user_id: Set(author_id),
                user_type: Set(r#type),
            }),
    )
    .exec(db)
    .await?;

    Ok(correction)
}

#[builder]
pub fn link_history<C: ConnectionTrait>(
    correction_id: i32,
    entity_history_id: i32,
    // TODO: More generic
    description: String,
    db: &C,
) -> impl Future<Output = Result<correction_revision::Model, DbErr>> + '_ {
    correction_revision::ActiveModel {
        correction_id: Set(correction_id),
        entity_history_id: Set(entity_history_id),
        description: Set(description),
    }
    .insert(db)
}

async fn link_user(
    data: impl IntoIterator<Item = (i32, CorrectionUserType)>,
    correction_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use correction_user::{ActiveModel, Entity};

    let models = data.into_iter().map(|(user_id, user_type)| ActiveModel {
        user_id: Set(user_id),
        correction_id: Set(correction_id),
        user_type: Set(user_type),
    });

    Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

pub async fn approve(
    correction_id: i32,
    approver_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let correction = utils::toggle_state(
        correction_id,
        approver_id,
        CorrectionStatus::Approved,
        tx,
    )
    .await?;

    match correction.entity_type {
        EntityType::Artist => {
            super::artist::apply_correction(correction, tx).await?;
        }
        EntityType::Label => {
            super::label::apply_correction(correction, tx).await?;
        }
        EntityType::Release => {
            super::release::apply_correction(correction, tx).await?;
        }
        EntityType::Song => {
            super::tag::apply_correction(correction, tx).await?;
        }
        EntityType::Tag => super::tag::apply_correction(correction, tx).await?,
    }

    Ok(())
}

pub mod user {
    use super::*;

    pub async fn find_author(
        correction_id: i32,
        db: &impl ConnectionTrait,
    ) -> Result<Option<correction_user::Model>, DbErr> {
        correction_user::Entity
            .select()
            .filter(correction_user::Column::CorrectionId.eq(correction_id))
            .filter(
                correction_user::Column::UserType
                    .eq(CorrectionUserType::Author),
            )
            .one(db)
            .await
    }

    pub mod utils {
        use super::*;

        pub async fn add_co_author_if_updater_not_author(
            correction_id: i32,
            updater_id: i32,
            tx: &DatabaseTransaction,
        ) -> Result<(), RepositoryError> {
            let author_id = find_author(correction_id, tx)
                .await?
                .map(|model| model.user_id)
                .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
                    entity_name: correction_user::Entity.table_name(),
                })?;

            if author_id != updater_id {
                let data = vec![(updater_id, CorrectionUserType::CoAuthor)];
                link_user(data, correction_id, tx).await?;
            }

            Ok(())
        }
    }
}

pub mod utils {
    use super::*;

    pub(super) async fn toggle_state(
        correction_id: i32,
        user_id: i32,
        status: CorrectionStatus,
        tx: &DatabaseTransaction,
    ) -> Result<correction::Model, RepositoryError> {
        let correction = correction::Entity::find_by_id(correction_id)
            .one(tx)
            .await?
            .ok_or(RepositoryError::EntityNotFound {
                entity_name: correction::Entity.table_name(),
            })?;

        let data = vec![(user_id, CorrectionUserType::Approver)];
        link_user(data, correction_id, tx).await?;

        let mut correction_active_model = correction.into_active_model();
        correction_active_model.status = Set(status);
        correction_active_model.handled_at = Set(Some(Utc::now().into()));

        let correction = correction_active_model.update(tx).await?;

        Ok(correction)
    }

    pub fn validate_entity_type(
        expected: EntityType,
        accepted: EntityType,
    ) -> Result<(), RepositoryError> {
        if expected == accepted {
            Ok(())
        } else {
            Err(RepositoryError::IncorrectCorrectionType { expected, accepted })
        }
    }
}
