use crate::domain::image_queue::{ImageQueue, NewImageQueue};
use crate::infra::database::error::DatabaseError;

pub trait Repo {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, DatabaseError>;

    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, DatabaseError>;
}
