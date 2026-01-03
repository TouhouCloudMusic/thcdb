use entity::release_image_queue::Model as DbModel;
use entity::sea_orm_active_enums::ReleaseImageType;
use macros::AutoMapper;

#[derive(Debug, Clone, PartialEq, Eq, AutoMapper)]
#[mapper(from(DbModel), into(DbModel))]
pub struct ReleaseImageQueue {
    pub release_id: i32,
    pub queue_id: i32,
    pub r#type: ReleaseImageType,
}

impl ReleaseImageQueue {
    pub const fn new(
        release_id: i32,
        queue_id: i32,
        r#type: ReleaseImageType,
    ) -> Self {
        Self {
            release_id,
            queue_id,
            r#type,
        }
    }

    pub const fn cover(release_id: i32, queue_id: i32) -> Self {
        Self {
            release_id,
            queue_id,
            r#type: ReleaseImageType::Cover,
        }
    }
}

pub trait Repo {
    async fn create(
        &self,
        queue_entry: ReleaseImageQueue,
    ) -> Result<ReleaseImageQueue, Box<dyn std::error::Error + Send + Sync>>;
}
