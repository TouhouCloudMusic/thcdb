mod http;
pub(crate) mod service;

pub mod find;

pub use http::router;

impl crate::features::correction::CorrectionEntity for tag_repo::write::NewTag {
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Tag
    }
}
