use bytes::Bytes;
use entity::release_image_queue::Model as DbReleaseImageQueue;
use entity::sea_orm_active_enums::ReleaseImageType;
use macros::AutoMapper;

use crate::features::user::User;

pub struct ReleaseCoverArtInput {
    pub bytes: Bytes,
    pub user: User,
    pub release_id: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, AutoMapper)]
#[mapper(from(DbReleaseImageQueue), into(DbReleaseImageQueue))]
pub struct ReleaseImageQueue {
    pub release_id: i32,
    pub queue_id: i32,
    pub r#type: ReleaseImageType,
}
