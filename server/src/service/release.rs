use bon::bon;
use entity::release;
use entity::sea_orm_active_enums::EntityType;
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::{
    DatabaseConnection, EntityTrait, Order, QueryOrder, QuerySelect,
    TransactionTrait,
};

use crate::domain::user::User;
use crate::dto::release::{ReleaseCorrection, ReleaseResponse};
use crate::error::{InvalidField, ServiceError};
use crate::repo;
use crate::utils::MapInto;

super::def_service!();

type Error = ServiceError;

#[bon]
impl Service {
    pub async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<ReleaseResponse, ServiceError> {
        repo::release::find_by_id(id, &self.db).await
    }

    pub async fn find_by_keyword(
        &self,
        keyword: String,
    ) -> Result<Vec<ReleaseResponse>, ServiceError> {
        repo::release::find_by_keyword(keyword, &self.db).await
    }

    pub async fn random(
        &self,
        count: u64,
    ) -> Result<Vec<release::Model>, Error> {
        release::Entity::find()
            .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
            .limit(count)
            .all(&self.db)
            .await
            .map_into()
    }

    pub async fn create(
        &self,
        data: ReleaseCorrection,
        user_id: i32,
    ) -> Result<release::Model, ServiceError> {
        // Question: Should check here?
        // TODO: Validate crate
        if data.artists.is_empty() {
            Err(InvalidField {
                field: "artist".into(),
                expected: "Vec<i32> && len > 1".into(),
                received: format!("{:?}", data.artists),
            })?;
        }

        let transaction = self.db.begin().await?;

        let result = repo::release::create(data, user_id, &transaction).await?;
        transaction.commit().await?;

        Ok(result)
    }

    #[builder]
    pub async fn create_or_update_correction(
        &self,
        release_id: i32,
        release_data: ReleaseCorrection,
        user: &User,
    ) -> Result<(), Error> {
        super::correction::create_or_update_correction()
            .entity_id(release_id)
            .entity_type(EntityType::Release)
            .user(user)
            .closure_args(release_data)
            .on_create(|_, data| {
                create_correction(release_id, user.id, data, &self.db)
            })
            .on_update(|_, data| {
                update_correction(release_id, user.id, data, &self.db)
            })
            .db(&self.db)
            .call()
            .await
    }
}

async fn create_correction(
    release_id: i32,
    author_id: i32,
    data: ReleaseCorrection,
    db: &DatabaseConnection,
) -> Result<(), Error> {
    let transaction = db.begin().await?;

    repo::release::create_correction(release_id, data, author_id, &transaction)
        .await?;

    transaction.commit().await?;
    Ok(())
}

async fn update_correction(
    release_id: i32,
    author_id: i32,
    data: ReleaseCorrection,
    db: &DatabaseConnection,
) -> Result<(), Error> {
    let transaction = db.begin().await?;

    let correction =
        repo::correction::find_latest(release_id, EntityType::Release, db)
            .await?;

    repo::release::update_correction(correction, data, author_id, &transaction)
        .await?;

    transaction.commit().await?;
    Ok(())
}
