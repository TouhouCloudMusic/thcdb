mod model;

pub use model::{ImageQueue, NewImageQueue};

use super::repository::RepositoryTrait;

pub trait Repository: RepositoryTrait {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Self::Error>;
    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Self::Error>;
}
