use entity::image::Model;
use libfp::FunctorExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, EntityTrait, IntoActiveModel, IntoActiveValue, QueryFilter,
};

use crate::domain::image;
use crate::domain::image::{Image, NewImage};
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{SeaOrmRepository, SeaOrmTxRepo};

impl image::Repo for SeaOrmRepository {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Image>, DatabaseError> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Id.eq(id))
            .one(&self.conn)
            .await
            .with_operation("find image by id")
            .map(FunctorExt::fmap_into)
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, DatabaseError> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(&self.conn)
            .await
            .with_operation("find image by filename")
            .map(FunctorExt::fmap_into)
    }
}

impl image::Repo for SeaOrmTxRepo {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Image>, DatabaseError> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Id.eq(id))
            .one(self.conn())
            .await
            .with_operation("find image by id")
            .map(FunctorExt::fmap_into)
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, DatabaseError> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(self.conn())
            .await
            .with_operation("find image by filename")
            .map(FunctorExt::fmap_into)
    }
}

async fn save_impl(
    conn: &impl sea_orm::ConnectionTrait,
    data: entity::image::ActiveModel,
) -> Result<Model, sea_orm::DbErr> {
    entity::image::Entity::insert(data)
        .exec_with_returning(conn)
        .await
}

impl IntoActiveModel<entity::image::ActiveModel> for NewImage {
    fn into_active_model(self) -> entity::image::ActiveModel {
        entity::image::ActiveModel {
            id: NotSet,
            filename: self.filename().into_active_value(),
            directory: self.directory.into_active_value(),
            uploaded_by: self.uploaded_by.into_active_value(),
            uploaded_at: NotSet,
            backend: Set(self.backend),
        }
    }
}

impl IntoActiveModel<entity::image::ActiveModel> for &NewImage {
    fn into_active_model(self) -> entity::image::ActiveModel {
        entity::image::ActiveModel {
            id: NotSet,
            filename: self.filename().into_active_value(),
            directory: self.directory.clone().into_active_value(),
            uploaded_by: self.uploaded_by.into_active_value(),
            uploaded_at: NotSet,
            backend: Set(self.backend),
        }
    }
}

impl image::TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        new_image: &NewImage,
    ) -> Result<Image, DatabaseError> {
        save_impl(self.conn(), new_image.into_active_model())
            .await
            .with_operation("create image")
            .fmap_into()
    }

    async fn delete(&self, id: i32) -> Result<(), DatabaseError> {
        entity::image::Entity::delete_many()
            .filter(entity::image::Column::Id.eq(id))
            .exec(self.conn())
            .await
            .with_operation("delete image")
            .map(|_| ())
    }
}
