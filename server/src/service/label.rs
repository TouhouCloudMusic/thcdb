use entity::sea_orm_active_enums::EntityType;
use entity::{correction, label};
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::label::NewLabel;
use crate::error::RepositoryError;
use crate::repo;

super::def_service!();

impl Service {
    pub async fn create(
        &self,
        user_id: i32,
        data: NewLabel,
    ) -> Result<label::Model, RepositoryError> {
        let tx = self.db.begin().await?;

        let model = repo::label::create(user_id, data, &tx).await?;

        tx.commit().await?;

        Ok(model)
    }

    pub async fn upsert_correction(
        &self,
        user_id: i32,
        label_id: i32,
        data: NewLabel,
    ) -> Result<(), RepositoryError> {
        super::correction::create_or_update_correction()
            .entity_id(label_id)
            .entity_type(EntityType::Label)
            .user_id(user_id)
            .closure_args(data)
            .on_create(|_, data| {
                create_correction(user_id, label_id, data, &self.db)
            })
            .on_update(|correction, data| {
                update_correction(user_id, correction, data, &self.db)
            })
            .db(&self.db)
            .call()
            .await
    }
}

async fn create_correction(
    user_id: i32,
    label_id: i32,
    data: NewLabel,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let tx = db.begin().await?;

    repo::label::create_correction(label_id, user_id, data, &tx).await?;

    tx.commit().await?;

    Ok(())
}

async fn update_correction(
    user_id: i32,
    correction: correction::Model,
    data: NewLabel,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let tx = db.begin().await?;

    repo::label::update_correction(user_id, correction, data, &tx).await?;

    tx.commit().await?;

    Ok(())
}
