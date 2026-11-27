use domain::shared::EntityIdent;
use entity::sea_orm_active_enums::{TagRelationType, TagType};
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
pub struct NewTagRelation {
    pub related_tag_id: i32,
    pub r#type: TagRelationType,
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
