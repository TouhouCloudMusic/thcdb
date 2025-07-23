use entity::artist_image_queue as db;
use libfp::BifunctorExt;
use sea_orm::{ConnectionTrait, DbErr, EntityTrait, IntoActiveModel};

use crate::domain::artist_image_queue::{ArtistImageQueue, Repository};
use crate::domain::repository::Connection;

impl<T> Repository for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, Self::Error> {
        db::Entity::insert(db::Model::from(queue).into_active_model())
            .exec_with_returning(self.conn())
            .await
            .bimap_into()
    }
}
