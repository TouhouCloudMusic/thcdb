use std::future::Future;

use bon::builder;
use chrono::Utc;
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
};
use entity::{correction, correction_revision, correction_user};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveModel,
};

type CorrectionResult = Result<correction::Model, DbErr>;

pub async fn find_by_id<C: ConnectionTrait>(
    correction_id: i32,
    db: &C,
) -> Result<Option<correction::Model>, DbErr> {
    correction::Entity::find_by_id(correction_id).one(db).await
}

#[builder]
pub async fn create<C: ConnectionTrait>(
    author_id: i32,
    description: String,
    entity_type: EntityType,
    entity_id: i32,
    db: &C,
) -> CorrectionResult {
    let result = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Create),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
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
    entity_id: i32,
    description: String,
    db: &C,
) -> Result<correction::Model, DbErr> {
    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Approved),
        r#type: Set(CorrectionType::Create),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
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
    });

    Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn handle(
    correction_id: i32,
    approver_id: i32,
    status: CorrectionStatus,
    tx: &DatabaseTransaction,
) -> Result<correction::Model, DbErr> {
    let correction = correction::Entity::find_by_id(correction_id)
        .one(tx)
        .await?;

    let correction =
        correction.ok_or(DbErr::Custom("Correction not found".to_owned()))?;

    let data = vec![(approver_id, CorrectionUserType::Approver)];
    link_user(data, correction_id, tx).await?;

    let mut correction_active_model = correction.into_active_model();
    correction_active_model.status = Set(status);
    correction_active_model.handled_at = Set(Some(Utc::now().into()));

    let correction = correction_active_model.update(tx).await?;

    Ok(correction)
}

pub async fn approve(
    correction_id: i32,
    approver_id: i32,
    tx: &DatabaseTransaction,
) -> Result<correction::Model, DbErr> {
    handle(correction_id, approver_id, CorrectionStatus::Approved, tx).await
}
