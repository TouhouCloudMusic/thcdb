use entity::release;
use sea_orm::{DatabaseConnection, DbErr, EntityTrait, TransactionTrait};

use crate::dto::correction::Metadata;
use crate::dto::release::GeneralReleaseDto;
use crate::error::ServiceError;
use crate::repo;

#[derive(Default, Clone)]
pub struct ReleaseService {
    database: DatabaseConnection,
}

impl ReleaseService {
    pub const fn new(database: DatabaseConnection) -> Self {
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
        release_data: GeneralReleaseDto,
        correction_data: Metadata,
    ) -> Result<release::Model, ServiceError> {
        // Question: Should check here?
        // TODO: Validate crate
        if release_data.artists.is_empty() {
            return Err(ServiceError::InvalidField {
                field: "artist".into(),
                expected: "Vec<i32> && len > 1".into(),
                accepted: format!("{:?}", release_data.artists),
            });
        }

        let transaction = self.database.begin().await?;

        let result =
            repo::release::create(release_data, correction_data, &transaction)
                .await?;
        transaction.commit().await?;

        Ok(result)
    }
}
