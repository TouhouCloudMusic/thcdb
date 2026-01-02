use entity::image_queue as db;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, EntityTrait, IntoActiveModel,
};
use snafu::ResultExt;

use crate::domain::Connection;
use crate::domain::image_queue::{ImageQueue, NewImageQueue, Repo};

impl<T> Repo for T
where
    T: Connection,
    T::Conn: ConnectionTrait,
{
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>> {
        db::Entity::insert(model.into_active_model())
            .exec_with_returning(self.conn())
            .await
            .map(Into::into)
            .boxed()
    }

    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>> {
        db::Model::from(model)
            .into_active_model()
            .update(self.conn())
            .await
            .map(Into::into)
            .boxed()
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
