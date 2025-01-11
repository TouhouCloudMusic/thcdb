use sea_orm::ActiveValue::Set;
use sea_orm::NotSet;
use entity::sea_orm_active_enums::TagKind;
use entity::{tag, tag_history};

pub struct NewTag {
    pub name: String,
    pub kind: TagKind,
    pub short_description: String,
    pub description: String
}

impl From<&NewTag> for tag::ActiveModel {
    fn from(value: &NewTag) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            kind: Set(value.kind.clone()),
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
            kind: Set(value.kind.clone()),
            short_description: Set(value.short_description.clone()),
            description: Set(value.description.clone()),
        }
    }
}