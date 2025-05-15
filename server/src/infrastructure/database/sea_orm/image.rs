use entity::image::Model;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, IntoActiveModel,
    IntoActiveValue, QueryFilter,
};

use crate::domain::image;
use crate::domain::model::image::{Image, NewImage};
use crate::domain::repository::Connection;
use crate::utils::MapInto;

impl<T> image::Repository for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn save(&self, new_image: &NewImage) -> Result<Image, Self::Error> {
        save_impl(self.conn(), new_image.into_active_model())
            .await
            .map_into()
    }

    async fn delete(&self, id: i32) -> Result<(), Self::Error> {
        entity::image::Entity::delete_many()
            .filter(entity::image::Column::Id.eq(id))
            .exec(self.conn())
            .await
            .map(|_| ())
    }

    async fn find_by_id(&self, id: i32) -> Result<Option<Image>, Self::Error> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Id.eq(id))
            .one(self.conn())
            .await
            .map(crate::utils::MapInto::map_into)
    }

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Self::Error> {
        entity::image::Entity::find()
            .filter(entity::image::Column::Filename.eq(filename))
            .one(self.conn())
            .await
            .map(crate::utils::MapInto::map_into)
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
