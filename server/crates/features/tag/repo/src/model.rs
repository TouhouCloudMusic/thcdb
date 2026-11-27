use entity::sea_orm_active_enums::{TagRelationType, TagType};
use serde::Serialize;
use utoipa::ToSchema;

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
