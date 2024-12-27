use std::future::Future;

use bon::builder;
use chrono::{DateTime, FixedOffset};
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
};
use entity::{correction, correction_revision, correction_user, user};
use sea_orm::prelude::DateTimeWithTimeZone;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
};

type CorrectionResult = Result<correction::Model, DbErr>;

#[builder]
pub async fn create<C: ConnectionTrait>(
    author_id: i32,
    description: String,
    entity_type: EntityType,

    db: &C,
) -> CorrectionResult {
    let result = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Create),
        entity_type: Set(entity_type),
        description: Set(description),
        created_at: NotSet,
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

pub fn link_history<C: ConnectionTrait>(
    correction_id: i32,
    entity_history_id: i32,
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

#[builder]
pub async fn create_self_approval<C: ConnectionTrait>(
    author_id: i32,
    entity_type: EntityType,
    description: String,
    db: &C,
) -> Result<correction::Model, DbErr> {
    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Create),
        entity_type: Set(entity_type),
        description: Set(description),
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

async fn link_user(
    data: Vec<(i32, CorrectionUserType)>,
    correction_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    use correction_user::{ActiveModel, Entity};

    let models = data.into_iter().map(|(user_id, user_type)| ActiveModel {
        user_id: Set(user_id),
        correction_id: Set(correction_id),
        user_type: Set(user_type),
        ..Default::default()
    });

    Entity::insert_many(models).exec(tx).await?;

    Ok(())
}
