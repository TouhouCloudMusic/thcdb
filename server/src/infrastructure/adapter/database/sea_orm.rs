use sea_orm::{ColumnTrait, DbErr, EntityTrait, IntoActiveModel, QueryFilter};

use crate::domain;

#[derive(Clone)]
pub struct SeaOrmRepository {
    conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}

impl domain::repository::image::Repository for SeaOrmRepository {
    type Error = DbErr;

    async fn create(
        &self,
        data: domain::entity::image::NewImage,
    ) -> Result<entity::image::Model, Self::Error> {
        entity::image::Entity::insert(data.into_active_model())
            .exec_with_returning(&self.conn)
            .await
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<entity::image::Model>, Self::Error> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(&self.conn)
            .await
    }
}
