use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};

use super::SeaOrmRepository;
use crate::domain;

impl domain::repository::image::Repository for SeaOrmRepository {
    type Error = DbErr;

    async fn create(
        &self,
        data: entity::image::ActiveModel,
    ) -> Result<entity::image::Model, Self::Error> {
        entity::image::Entity::insert(data)
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
