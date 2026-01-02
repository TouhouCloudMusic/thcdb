use entity::image::Model;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, IntoActiveModel,
    IntoActiveValue, QueryFilter,
};
use snafu::ResultExt;

use crate::domain::image::{Image, NewImage};
use crate::domain::{Connection, image};
use crate::infra::database::sea_orm::SeaOrmTxRepo;

impl<T> image::Repo for T
where
    T: Connection,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Image>, Box<dyn std::error::Error + Send + Sync>> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Id.eq(id))
            .one(self.conn())
            .await
            .map(|model| model.map(Into::into))
            .boxed()
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Box<dyn std::error::Error + Send + Sync>> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(self.conn())
            .await
            .map(|model| model.map(Into::into))
            .boxed()
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
    ) -> Result<Image, Box<dyn std::error::Error + Send + Sync>> {
        save_impl(self.conn(), new_image.into_active_model())
            .await
            .map(Into::into)
            .boxed()
    }

    async fn delete(
        &self,
        id: i32,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        entity::image::Entity::delete_many()
            .filter(entity::image::Column::Id.eq(id))
            .exec(self.conn())
            .await
            .map(|_| ())
            .boxed()
    }
}
