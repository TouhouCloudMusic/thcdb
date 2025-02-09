use entity::tag;
use sea_orm::TransactionTrait;

use crate::dto::correction::Metadata;
use crate::dto::tag::NewTag;
use crate::error::RepositoryError;
use crate::repo;

super::def_service!();

impl Service {
    pub async fn create(
        &self,
        user_id: i32,
        tag_data: NewTag,
        correction_data: Metadata,
    ) -> Result<tag::Model, RepositoryError> {
        let transaction = self.db.begin().await?;
        let result =
            repo::tag::create(user_id, tag_data, correction_data, &transaction)
                .await?;
        transaction.commit().await?;
        Ok(result)
    }
}
