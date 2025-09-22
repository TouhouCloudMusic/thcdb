use entity::enums::EntityType;
use entity::sea_orm_active_enums::{TagRelationType, TagType};
use serde::Deserialize;
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::EntityIdent;

#[derive(Deserialize, ToSchema)]
pub struct NewTag {
    pub name: EntityIdent,
    pub r#type: TagType,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub alt_names: Option<Vec<String>>,
    pub relations: Option<Vec<NewTagRelation>>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewTagRelation {
    pub related_tag_id: i32,
    pub r#type: TagRelationType,
}

impl CorrectionEntity for NewTag {
    fn entity_type() -> EntityType {
        EntityType::Tag
    }
}
