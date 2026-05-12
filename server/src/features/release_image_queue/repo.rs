use crate::domain::release_image_queue::ReleaseImageQueue;
use crate::infra::database::error::DatabaseError;

pub trait Repo {
    async fn create(
        &self,
        queue_entry: ReleaseImageQueue,
    ) -> Result<ReleaseImageQueue, DatabaseError>;
}
