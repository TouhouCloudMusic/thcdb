use entity::release_image_queue;
use libfp::FunctorExt;
use sea_orm::{EntityTrait, IntoActiveModel};

use super::SeaOrmTxRepo;
use crate::domain::release_image_queue::ReleaseImageQueue;
use crate::features::release_image_queue::Repo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        queue_entry: ReleaseImageQueue,
    ) -> Result<ReleaseImageQueue, DatabaseError> {
        release_image_queue::Entity::insert(
            release_image_queue::Model::from(queue_entry).into_active_model(),
        )
        .exec_with_returning(self.conn())
        .await
        .with_operation("create release image queue")
        .fmap_into()
    }
}
