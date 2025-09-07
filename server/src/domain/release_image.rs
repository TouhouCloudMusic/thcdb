use entity::release_image::Model as DbModel;
use entity::sea_orm_active_enums::ReleaseImageType;
use macros::AutoMapper;

use super::repository::Connection;

#[derive(Debug, Clone, PartialEq, Eq, AutoMapper)]
#[mapper(from(DbModel), into(DbModel))]
pub struct ReleaseImage {
    pub release_id: i32,
    pub image_id: i32,
    pub r#type: ReleaseImageType,
}

impl ReleaseImage {
    pub const fn new(
        release_id: i32,
        image_id: i32,
        r#type: ReleaseImageType,
    ) -> Self {
        Self {
            release_id,
            image_id,
            r#type,
        }
    }

    pub const fn cover(release_id: i32, image_id: i32) -> Self {
        Self {
            release_id,
            image_id,
            r#type: ReleaseImageType::Cover,
        }
    }
}

pub trait Repo: Connection {
    async fn create(
        &self,
        image: ReleaseImage,
    ) -> Result<ReleaseImage, Box<dyn std::error::Error + Send + Sync>>;
}
