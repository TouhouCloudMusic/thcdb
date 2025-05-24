use entity::enums::EntityType;
use entity::sea_orm_active_enums::TagType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::EntityIdent;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Tag {
    pub id: i32,
    pub name: String,
    pub r#type: TagType,
    pub short_description: Option<String>,
    pub description: Option<String>,
    pub alt_names: Vec<AlternativeName>,
    pub relations: Vec<TagRelation>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct AlternativeName {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct TagRelation {
    pub related_tag_id: i32,
    pub r#type: entity::sea_orm_active_enums::TagRelationType,
}

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
    pub r#type: entity::sea_orm_active_enums::TagRelationType,
}

impl CorrectionEntity for NewTag {
    fn entity_type() -> EntityType {
        EntityType::Tag
    }
}
