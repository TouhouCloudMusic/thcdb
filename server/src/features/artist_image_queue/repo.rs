use crate::domain::artist_image_queue::ArtistImageQueue;

pub trait Repo {
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}

