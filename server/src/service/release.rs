use entity::release;
use error_set::error_set;
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::{
    DatabaseConnection, DbErr, EntityTrait, Order, QueryOrder, QuerySelect,
    TransactionTrait,
};

use crate::dto::correction::Metadata;
use crate::dto::release::GeneralRelease;
use crate::error::{InvalidField, RepositoryError};
use crate::repo;

#[derive(Default, Clone)]
pub struct ReleaseService {
    db: DatabaseConnection,
}

error_set! {
    #[disable(From(repo::release::Error))]
    Error = {
        Repo(repo::release::Error)
    };
}

impl<T> From<T> for Error
where
    T: Into<repo::release::Error>,
{
    fn from(err: T) -> Self {
        Self::Repo(err.into())
    }
}

impl ReleaseService {
    pub const fn new(database: DatabaseConnection) -> Self {
        Self { db: database }
    }

    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<release::Model>, DbErr> {
        release::Entity::find_by_id(id).one(&self.db).await
    }

    pub async fn create(
        &self,
        release_data: GeneralRelease,
        correction_data: Metadata,
    ) -> Result<release::Model, RepositoryError> {
        // Question: Should check here?
        // TODO: Validate crate
        if release_data.artists.is_empty() {
            Err(InvalidField {
                field: "artist".into(),
                expected: "Vec<i32> && len > 1".into(),
                accepted: format!("{:?}", release_data.artists),
            })?;
        }

        let transaction = self.db.begin().await?;

        let result =
            repo::release::create(release_data, correction_data, &transaction)
                .await?;
        transaction.commit().await?;

        Ok(result)
    }

    pub async fn random(
        &self,
        count: u64,
    ) -> Result<Vec<release::Model>, DbErr> {
        release::Entity::find()
            .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
            .limit(count)
            .all(&self.db)
            .await
    }
}
