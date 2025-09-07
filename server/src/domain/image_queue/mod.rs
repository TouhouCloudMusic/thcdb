mod model;

pub use model::{ImageQueue, NewImageQueue};

use super::repository::Connection;

pub trait Repo: Connection {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>>;
    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}
