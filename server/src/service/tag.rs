use entity::sea_orm_active_enums::EntityType;
use entity::tag;
use sea_orm::{DatabaseConnection, EntityName};

use crate::dto::tag::{TagCorrection, TagResponse};
use crate::error::ServiceError;
use crate::repo::tag::TagRepository;
use crate::utils::MapInto;

#[derive(Clone)]
pub struct Service<T> {
    db: DatabaseConnection,
    repo: T,
}

#[bon::bon]
impl<T> Service<T>
where
    T: TagRepository + Send + Sync,
    ServiceError: From<<T as TagRepository>::Error>,
{
    pub const fn new(db: DatabaseConnection, repo: T) -> Self {
        Self { db, repo }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<TagResponse, ServiceError> {
        self.repo.find_one(id).await?.ok_or_else(|| {
            ServiceError::EntityNotFound {
                entity_name: tag::Entity.table_name(),
            }
        })
    }

    pub async fn find_by_keyword(
        &self,
        kw: &str,
    ) -> Result<Vec<TagResponse>, ServiceError> {
        self.repo.find_by_keyword(kw).await.map_into()
    }

    pub async fn create(
        &self,
        user_id: i32,
        data: TagCorrection,
    ) -> Result<(), ServiceError> {
        self.repo.create(user_id, data).await?;
        Ok(())
    }

    #[builder]
    pub async fn upsert_correction(
        &self,
        user_id: i32,
        tag_id: i32,
        data: TagCorrection,
    ) -> Result<(), ServiceError> {
        super::correction::create_or_update_correction()
            .entity_id(tag_id)
            .entity_type(EntityType::Tag)
            .user_id(user_id)
            .closure_args(data)
            .on_create(|_, data| {
                self.repo.create_correction(user_id, tag_id, data)
            })
            .on_update(|correction: entity::correction::Model, data| {
                self.repo.update_correction(user_id, correction.id, data)
            })
            .db(&self.db)
            .call()
            .await
    }
}
