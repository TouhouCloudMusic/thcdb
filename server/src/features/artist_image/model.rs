use bytes::Bytes;
use entity::artist_image_queue::Model as DbArtistImageQueue;
use entity::sea_orm_active_enums::ArtistImageType;
use macros::AutoMapper;

use crate::features::user::User;

pub struct ArtistProfileImageInput {
    pub bytes: Bytes,
    #[doc(alias = "uploaded_by")]
    pub user: User,
    pub artist_id: i32,
}

#[derive(AutoMapper)]
#[mapper(from(DbArtistImageQueue), into(DbArtistImageQueue))]
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
