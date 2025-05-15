use entity::sea_orm_active_enums::EntityType;
use entity::{correction, event};
use sea_orm::{DatabaseConnection, DbErr, TransactionTrait};

use crate::domain::user::User;
use crate::dto::event::{EventCorrection, EventResponse};
use crate::error::ServiceError;
use crate::repo;

super::def_service!();

impl Service {
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<EventResponse, ServiceError> {
        repo::event::find_by_id(id, &self.db).await
    }

    pub async fn find_by_keyword(
        &self,
        keyword: String,
    ) -> Result<Vec<EventResponse>, DbErr> {
        repo::event::find_by_keyword(keyword, &self.db).await
    }

    pub async fn create(
        &self,
        user_id: i32,
        data: EventCorrection,
    ) -> Result<event::Model, DbErr> {
        let transaction = self.db.begin().await?;

        let result = repo::event::create(user_id, data, &transaction).await?;

        transaction.commit().await?;
        Ok(result)
    }

    pub async fn upsert_correction(
        &self,
        event_id: i32,
        user: &User,
        data: EventCorrection,
    ) -> Result<(), ServiceError> {
        super::correction::create_or_update_correction()
            .entity_id(event_id)
            .entity_type(EntityType::Event)
            .user(user)
            .closure_args(data)
            .on_create(|_, data| {
                create_correction(event_id, user.id, data, &self.db)
            })
            .on_update(|correction, data| {
                update_correction(correction, user.id, data, &self.db)
            })
            .db(&self.db)
            .call()
            .await
    }
}

async fn create_correction(
    event_id: i32,
    user_id: i32,
    data: EventCorrection,
    db: &DatabaseConnection,
) -> Result<(), ServiceError> {
    let transaction = db.begin().await?;
    let tx = &transaction;

    repo::event::create_correction(user_id, event_id, data, tx).await?;

    transaction.commit().await?;

    Ok(())
}

async fn update_correction(
    correction: correction::Model,
    user_id: i32,
    data: EventCorrection,
    db: &DatabaseConnection,
) -> Result<(), ServiceError> {
    let transaction = db.begin().await?;
    let tx = &transaction;

    repo::event::update_correction(user_id, correction, data, tx).await?;

    transaction.commit().await?;

    Ok(())
}
