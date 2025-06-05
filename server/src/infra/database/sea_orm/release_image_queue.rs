use entity::release_image_queue;
use sea_orm::{EntityTrait, IntoActiveModel};

use super::SeaOrmTxRepo;
use crate::domain::release_image_queue::{ReleaseImageQueue, Repo};
use crate::domain::repository::Connection;
use crate::utils::MapInto;

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        queue_entry: ReleaseImageQueue,
    ) -> Result<ReleaseImageQueue, Self::Error> {
        release_image_queue::Entity::insert(
            release_image_queue::Model::from(queue_entry).into_active_model(),
        )
        .exec_with_returning(self.conn())
        .await
        .map_into()
    }
}
