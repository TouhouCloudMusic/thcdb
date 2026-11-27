mod http;
pub(crate) mod service;

pub mod find;

pub use http::router;

impl crate::features::correction::CorrectionEntity
    for label_repo::write::NewLabel
{
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Label
    }
}
