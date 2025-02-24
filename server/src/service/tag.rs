use entity::sea_orm_active_enums::EntityType;
use entity::tag;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::correction::Metadata;
use crate::dto::tag::{NewTag, TagResponse};
use crate::error::RepositoryError;
use crate::repo;

super::def_service!();

#[bon::bon]
impl Service {
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<TagResponse, RepositoryError> {
        repo::tag::find_by_id(id, &self.db).await
    }

    pub async fn find_by_keyword(
        &self,
        kw: impl Into<String>,
    ) -> Result<Vec<TagResponse>, RepositoryError> {
        repo::tag::find_by_keyword(kw, &self.db).await
    }

    pub async fn create(
        &self,
        user_id: i32,
        data: NewTag,
        correction_data: Metadata,
    ) -> Result<tag::Model, RepositoryError> {
        let transaction = self.db.begin().await?;
        let result =
            repo::tag::create(user_id, data, correction_data, &transaction)
                .await?;
        transaction.commit().await?;
        Ok(result)
    }

    #[builder]
    pub async fn upsert_correction(
        &self,
        user_id: i32,
        tag_id: i32,
        data: NewTag,
        correction_metadata: Metadata,
    ) -> Result<(), RepositoryError> {
        let tx = self.db.begin().await?;

        let res = super::correction::create_or_update_correction()
            .entity_id(tag_id)
            .entity_type(EntityType::Tag)
            .user_id(user_id)
            .closure_args((data, correction_metadata))
            .on_create(|_, (data, metadata)| {
                repo::tag::create_correction(
                    tag_id, user_id, data, metadata, &tx,
                )
            })
            .on_update(|correction, (data, metadata)| {
                repo::tag::update_correction(
                    user_id, correction, data, metadata, &tx,
                )
            })
            .db(&self.db)
            .call()
            .await;

        tx.commit().await?;

        res
    }
}

async fn create_correction(
    tag_id: i32,
    user_id: i32,
    data: NewTag,
    correction_metadata: Metadata,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let tx = db.begin().await?;

    repo::tag::create_correction(
        tag_id,
        user_id,
        data,
        correction_metadata,
        &tx,
    )
    .await?;

    tx.commit().await?;

    Ok(())
}

async fn update_correction(
    user_id: i32,
    correction: entity::correction::Model,
    data: NewTag,
    metadata: Metadata,
    db: &DatabaseConnection,
) -> Result<(), RepositoryError> {
    let tx = db.begin().await?;

    repo::tag::update_correction(user_id, correction, data, metadata, &tx)
        .await?;

    tx.commit().await?;

    Ok(())
}
