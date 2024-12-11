use entity::release;
use sea_orm::{DatabaseConnection, DbErr, EntityTrait, TransactionTrait};

use crate::error::ServiceError;
use crate::repository;
use crate::repository::release::CreateReleaseDto;

#[derive(Default, Clone)]
pub struct ReleaseService {
    database: DatabaseConnection,
}

impl ReleaseService {
    pub fn new(database: DatabaseConnection) -> Self {
        Self { database }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<release::Model>, DbErr> {
        release::Entity::find_by_id(id).one(&self.database).await
    }

    pub async fn create(
        &self,
        data: CreateReleaseDto,
    ) -> Result<release::Model, ServiceError> {
        // Question: Should check here?
        // TODO: Validate crate
        if data.artists.is_empty() {
            return Err(ServiceError::InvalidField {
                field: "artist".into(),
                expected: "Vec<i32> && len > 1".into(),
                accepted: format!("{:?}", data.artists),
            });
        }

        let transaction = self.database.begin().await?;

        let result = repository::release::create(data, &transaction).await?;
        transaction.commit().await?;

        Ok(result)
    }
}
