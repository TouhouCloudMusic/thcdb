use entity::artist_image_queue as db;
use sea_orm::{EntityTrait, IntoActiveModel};
use snafu::ResultExt;

use crate::domain::artist_image_queue::ArtistImageQueue;
use crate::features::artist_image_queue::Repo;
use crate::infra::database::sea_orm::SeaOrmTxRepo;

impl Repo for SeaOrmTxRepo {
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, Box<dyn std::error::Error + Send + Sync>>
    {
        db::Entity::insert(db::Model::from(queue).into_active_model())
            .exec_with_returning(self.conn())
            .await
            .map(Into::into)
            .boxed()
    }
}
