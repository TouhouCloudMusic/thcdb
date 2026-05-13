use crate::domain::artist_image_queue::ArtistImageQueue;
use crate::infra::database::error::DatabaseError;

pub trait Repo {
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, DatabaseError>;
}
