use domain::shared::EntityIdent;
use entity::enums::EntityType;
use entity::sea_orm_active_enums::{TagRelationType, TagType};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;

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

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")]
)]
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct Tag {
    pub id: i32,
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub description: String,
    pub alt_names: Vec<AlternativeName>,
    pub relations: Vec<TagRelation>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AlternativeName {
    pub id: i32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TagRef {
    pub id: i32,
    pub name: String,
    pub r#type: TagType,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct TagRelation {
    pub tag: TagRef,
    pub r#type: TagRelationType,
}
