use entity::sea_orm_active_enums::TagType;
use entity::{tag, tag_history};
use sea_orm::ActiveValue::{NotSet, Set};

pub struct NewTag {
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub description: String,
}

impl From<&NewTag> for tag::ActiveModel {
    fn from(value: &NewTag) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            r#type: Set(value.r#type),
            short_description: Set(value.short_description.clone()),
            description: Set(value.description.clone()),
        }
    }
}

impl From<&NewTag> for tag_history::ActiveModel {
    fn from(value: &NewTag) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            r#type: Set(value.r#type),
            short_description: Set(value.short_description.clone()),
            description: Set(value.description.clone()),
        }
    }
}
