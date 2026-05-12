use entity::artist_image_queue as db;
use sea_orm::{EntityTrait, IntoActiveModel};

use crate::domain::artist_image_queue::ArtistImageQueue;
use crate::features::artist_image_queue::Repo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::SeaOrmTxRepo;

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, DatabaseError> {
        db::Entity::insert(db::Model::from(queue).into_active_model())
            .exec_with_returning(self.conn())
            .await
            .with_operation("create artist image queue")
            .map(Into::into)
    }
}
