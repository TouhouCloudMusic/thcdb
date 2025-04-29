use entity::artist_image_queue as db;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait, IntoActiveModel};

use crate::domain::artist_image_queue::{ArtistImageQueue, Repository};
use crate::domain::repository::RepositoryTrait;
use crate::utils::MapInto;

impl<T> Repository for T
where
    T: RepositoryTrait<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, Self::Error> {
        db::Entity::insert(db::Model::from(queue).into_active_model())
            .exec_with_returning(self.conn())
            .await
            .map_into()
    }
}
