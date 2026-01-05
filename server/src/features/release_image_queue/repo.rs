use crate::domain::release_image_queue::ReleaseImageQueue;

pub trait Repo {
    async fn create(
        &self,
        queue_entry: ReleaseImageQueue,
    ) -> Result<ReleaseImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}

