use entity::tag;
use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::dto::correction::Metadata;
use crate::dto::tag::NewTag;
use crate::error::RepositoryError;
use crate::repo;

#[derive(Default, Clone)]
pub struct TagService {
    db: DatabaseConnection,
}

impl TagService {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        tag_data: NewTag,
        correction_data: Metadata,
    ) -> Result<tag::Model, RepositoryError> {
        let transaction = self.db.begin().await?;
        let result =
            repo::tag::create(tag_data, correction_data, &transaction).await?;
        transaction.commit().await?;
        Ok(result)
    }
}
