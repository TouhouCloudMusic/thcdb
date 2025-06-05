mod model;

pub use model::{ImageQueue, NewImageQueue};

use super::repository::Connection;

pub trait Repo: Connection {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Self::Error>;
    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Self::Error>;
}
