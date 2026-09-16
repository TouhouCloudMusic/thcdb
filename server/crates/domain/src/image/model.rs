use bon::Builder;
use chrono::{DateTime, FixedOffset};
use entity::enums::StorageBackend;
use entity::image::Model as DbImage;
use macros::AutoMapper;

#[derive(Clone, Debug, AutoMapper, Builder)]
#[mapper(from(DbImage))]
pub struct Image {
    pub id: i32,
    pub backend: StorageBackend,
    pub object_key: String,
    pub uploaded_by: i32,
    pub uploaded_at: DateTime<FixedOffset>,
}
