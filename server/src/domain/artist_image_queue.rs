use entity::artist_image_queue::Model as DbModel;
use entity::sea_orm_active_enums::ArtistImageType;
use macros::AutoMapper;

use super::repository::Connection;

#[derive(AutoMapper)]
#[mapper(from(DbModel), into(DbModel))]
pub struct ArtistImageQueue {
    artist_id: i32,
    queue_id: i32,
    r#type: ArtistImageType,
}

impl ArtistImageQueue {
    pub const fn profile(artist_id: i32, queue_id: i32) -> Self {
        Self {
            artist_id,
            queue_id,
            r#type: ArtistImageType::Profile,
        }
    }
}

pub trait Repository: Connection {
    async fn create(
        &self,
        queue: ArtistImageQueue,
    ) -> Result<ArtistImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}
