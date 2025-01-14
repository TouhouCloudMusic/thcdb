use entity::sea_orm_active_enums::{TagRelationType, TagType};
use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use sea_orm::ActiveValue::{NotSet, Set};

pub struct NewTag {
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub description: String,
    // Relations
    pub alt_names: Vec<AltName>,
    pub relations: Vec<NewTagRelation>,
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

pub enum AltName {
    Alternative { name: String },
    Translation { name: String, language_id: i32 },
}

impl From<&AltName> for tag_alternative_name::ActiveModel {
    /// The `tag_id` is not set
    fn from(value: &AltName) -> Self {
        match value {
            AltName::Alternative { name } => Self {
                id: NotSet,
                tag_id: NotSet,
                name: Set(name.clone()),
                is_origin_language: Set(true),
                language_id: Set(None),
            },
            AltName::Translation { name, language_id } => Self {
                id: NotSet,
                tag_id: NotSet,
                name: Set(name.clone()),
                is_origin_language: Set(false),
                language_id: Set(Some(*language_id)),
            },
        }
    }
}

impl From<&AltName> for tag_alternative_name_history::ActiveModel {
    fn from(value: &AltName) -> Self {
        match value {
            AltName::Alternative { name } => Self {
                id: NotSet,
                history_id: NotSet,
                name: Set(name.clone()),
                is_origin_language: Set(true),
                language_id: Set(None),
            },
            AltName::Translation { name, language_id } => Self {
                id: NotSet,
                history_id: NotSet,
                name: Set(name.clone()),
                is_origin_language: Set(false),
                language_id: Set(Some(*language_id)),
            },
        }
    }
}

pub struct NewTagRelation {
    pub related_tag_id: i32,
    pub r#type: TagRelationType,
}

impl From<&NewTagRelation> for tag_relation::ActiveModel {
    fn from(value: &NewTagRelation) -> Self {
        Self {
            tag_id: NotSet,
            related_tag_id: Set(value.related_tag_id),
            r#type: Set(value.r#type),
        }
    }
}

impl From<&NewTagRelation> for tag_relation_history::ActiveModel {
    fn from(value: &NewTagRelation) -> Self {
        Self {
            history_id: NotSet,
            related_tag_id: Set(value.related_tag_id),
            r#type: Set(value.r#type),
        }
    }
}
