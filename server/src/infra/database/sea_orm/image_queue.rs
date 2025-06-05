use entity::image_queue as db;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, DbErr, EntityTrait, IntoActiveModel,
};

use crate::domain::image_queue::{ImageQueue, NewImageQueue, Repo};
use crate::domain::repository::Connection;
use crate::utils::MapInto;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Self::Error> {
        db::Entity::insert(model.into_active_model())
            .exec_with_returning(self.conn())
            .await
            .map_into()
    }

    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Self::Error> {
        db::Model::from(model)
            .into_active_model()
            .update(self.conn())
            .await
            .map(Into::into)
    }
}

impl IntoActiveModel<db::ActiveModel> for NewImageQueue {
    fn into_active_model(self) -> db::ActiveModel {
        db::ActiveModel {
            id: NotSet,
            image_id: Set(Some(self.image_id)),
            status: NotSet,
            handled_at: NotSet,
            handled_by: NotSet,
            reverted_at: NotSet,
            reverted_by: NotSet,
            created_at: NotSet,
            creaded_by: Set(self.creaded_by),
        }
    }
}
