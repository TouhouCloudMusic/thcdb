use entity::image_queue as db;
use libfp::FunctorExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, EntityTrait, IntoActiveModel};

use crate::domain::image_queue::{ImageQueue, NewImageQueue};
use crate::features::image_queue::Repo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::SeaOrmTxRepo;

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, DatabaseError> {
        db::Entity::insert(model.into_active_model())
            .exec_with_returning(self.conn())
            .await
            .with_operation("create image queue")
            .fmap_into()
    }

    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, DatabaseError> {
        db::Model::from(model)
            .into_active_model()
            .update(self.conn())
            .await
            .with_operation("update image queue")
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
            created_by: Set(self.created_by),
        }
    }
}
