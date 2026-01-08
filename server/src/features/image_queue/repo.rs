use crate::domain::image_queue::{ImageQueue, NewImageQueue};

pub trait Repo {
    async fn create(
        &self,
        model: NewImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>>;

    async fn update(
        &self,
        model: ImageQueue,
    ) -> Result<ImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}
