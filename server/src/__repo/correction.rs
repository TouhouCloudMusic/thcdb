use bon::builder;
use chrono::Utc;
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
use user::utils::add_co_author_if_updater_not_author;

use crate::error::ServiceError;

pub async fn find_latest(
    entity_id: i32,
    entity_type: EntityType,
    db: &impl ConnectionTrait,
) -> Result<correction::Model, ServiceError> {
    correction::Entity::find()
        .filter(correction::Column::EntityId.eq(entity_id))
        .filter(correction::Column::EntityType.eq(entity_type))
        .order_by_desc(correction::Column::Id)
        .one(db)
        .await?
        .ok_or_else(|| ServiceError::EntityNotFound {
            entity_name: correction::Entity.table_name(),
        })
}

/// Create a new pending correction and link the entity history to its revision
///
/// Type and status is optional
/// - Default type is `CorrectionType::Update`
/// - Default status is `CorrectionStatus::Pending`
///
/// ```
/// repo::correction::create()
///     .author_id(user_id)
///     .entity_id(event_id)
///     .entity_type(EntityType::Event)
///     .call(db)
///     .await?;
/// ```
#[builder]
pub async fn create(
    #[builder(finish_fn)] db: &DatabaseTransaction,
    author_id: i32,
    entity_id: i32,
    history_id: i32,
    entity_type: EntityType,
    #[builder(into)] description: String,
    /// Default = `CorrectionStatus::Pending`
    status: Option<CorrectionStatus>,
    /// Default = `CorrectionType::Update`
    r#type: Option<CorrectionType>,
) -> Result<correction::Model, DbErr> {
    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(status.unwrap_or(CorrectionStatus::Pending)),
        r#type: Set(r#type.unwrap_or(CorrectionType::Update)),
        entity_type: Set(entity_type),
        entity_id: Set(entity_id),
        created_at: NotSet,
        handled_at: NotSet,
    }
    .insert(db)
    .await?;

    // TODO: remove dupelicate correction user table
    correction_user::ActiveModel {
        correction_id: Set(correction.id),
        user_id: Set(author_id),
        user_type: Set(CorrectionUserType::Author),
    }
    .insert(db)
    .await?;

    revision::create()
        .correction_id(correction.id)
        .author_id(author_id)
        .entity_history_id(history_id)
        .description(description)
        .call(db)
        .await?;

    Ok(correction)
}

/// Create a self approval correction and link the history to its revision
#[builder]
pub async fn create_self_approval(
    #[builder(finish_fn)] db: &DatabaseTransaction,
    author_id: i32,
    entity_type: EntityType,
    entity_id: i32,
    #[builder(into)] description: String,
    history_id: i32,
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

    let task1 = correction_user::Entity::insert_many(
        [CorrectionUserType::Author, CorrectionUserType::Approver]
            .into_iter()
            .map(|r#type| correction_user::ActiveModel {
                correction_id: Set(correction.id),
                user_id: Set(author_id),
                user_type: Set(r#type),
            }),
    )
    .exec(db);

    let task2 = correction_revision::Model {
        correction_id: correction.id,
        entity_history_id: history_id,
        description,
        author_id,
    }
    .into_active_model()
    .insert(db);

    tokio::try_join!(task1, task2)?;

    Ok(correction)
}

/// Add co-author if updater is not the original author, then insert new correction revision
#[builder]
pub async fn update(
    #[builder(finish_fn)] db: &DatabaseTransaction,
    author_id: i32,
    history_id: i32,
    description: String,
    correction_id: i32,
) -> Result<(), DbErr> {
    add_co_author_if_updater_not_author(correction_id, author_id, db).await?;

    correction_revision::Model {
        correction_id,
        entity_history_id: history_id,
        description,
        author_id,
    }
    .into_active_model()
    .insert(db)
    .await?;

    Ok(())
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

// pub async fn approve(
//     correction_id: i32,
//     approver_id: i32,
//     tx: &DatabaseTransaction,
// ) -> Result<(), ServiceError> {
//     let correction = utils::toggle_state(
//         correction_id,
//         approver_id,
//         CorrectionStatus::Approved,
//         tx,
//     )
//     .await?;

//     match correction.entity_type {
//         EntityType::Artist => {
//             super::artist::apply_correction(correction, tx).await?;
//         }
//         EntityType::Label => {
//             super::label::apply_correction(correction, tx).await?;
//         }
//         EntityType::Release => {
//             super::release::apply_correction(correction, tx).await?;
//         }
//         EntityType::Song => {
//             super::song::apply_correction(correction, tx).await?;
//         }
//         EntityType::Tag => super::tag::apply_correction(correction, tx).await?,
//         EntityType::Event => {
//             super::event::apply_correction(correction, tx).await?;
//         }
//     }

//     Ok(())
// }

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

    pub(super) mod utils {
        use super::*;

        pub async fn add_co_author_if_updater_not_author(
            correction_id: i32,
            updater_id: i32,
            tx: &DatabaseTransaction,
        ) -> Result<(), DbErr> {
            let author_id = find_author(correction_id, tx)
                .await?
                .map(|model| model.user_id)
                .ok_or_else(|| {
                    DbErr::Custom(
                        "Author not found. This should not happen".to_string(),
                    )
                })?;

            if author_id != updater_id {
                let data = vec![(updater_id, CorrectionUserType::CoAuthor)];
                link_user(data, correction_id, tx).await?;
            }

            Ok(())
        }
    }
}

pub mod revision {
    use bon::builder;
    use entity::correction_revision;
    use sea_orm::{
        ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityName,
        EntityTrait, IntoActiveModel, QueryFilter, QueryOrder,
    };

    use crate::error::ServiceError;

    pub async fn find_latest(
        correction_id: i32,
        db: &impl ConnectionTrait,
    ) -> Result<correction_revision::Model, ServiceError> {
        correction_revision::Entity::find()
            .filter(correction_revision::Column::CorrectionId.eq(correction_id))
            .order_by_desc(correction_revision::Column::EntityHistoryId)
            .one(db)
            .await?
            .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
                entity_name: correction_revision::Entity.table_name(),
            })
    }

    // Note: just inline
    // #[builder]
    // pub async fn create(
    //     #[builder(finish_fn)] db: &impl ConnectionTrait,
    //     author_id: i32,
    //     correction_id: i32,
    //     entity_history_id: i32,
    //     #[builder(into)] description: String,
    // ) -> Result<correction_revision::Model, DbErr> {
    //     correction_revision::Model {
    //         correction_id,
    //         entity_history_id,
    //         description,
    //         author_id,
    //     }
    //     .into_active_model()
    //     .insert(db)
    //     .await
    // }
}

pub mod utils {
    use super::*;

    pub(super) async fn toggle_state(
        correction_id: i32,
        user_id: i32,
        status: CorrectionStatus,
        tx: &DatabaseTransaction,
    ) -> Result<correction::Model, ServiceError> {
        let correction = correction::Entity::find_by_id(correction_id)
            .one(tx)
            .await?
            .ok_or(ServiceError::EntityNotFound {
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
}
