use entity::sea_orm_active_enums::{TagRelationType, TagType};
use entity::{
    tag, tag_alternative_name, tag_alternative_name_history, tag_history,
    tag_relation, tag_relation_history,
};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::correction::Metadata;

#[derive(Clone, Serialize, ToSchema)]
#[schema(
    as = Tag
)]
pub struct TagResponse {
    pub id: i32,
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub description: String,
    // Relations
    pub alt_names: Vec<AltName>,
    pub relations: Vec<TagRelation>,
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct TagCorrection {
    pub name: String,
    pub r#type: TagType,
    pub short_description: String,
    pub description: String,
    // Relations
    pub alt_names: Vec<AltName>,
    pub relations: Vec<TagRelation>,
    pub correction_metadata: Metadata,
}

impl_from!(
    TagCorrection >
    tag::ActiveModel {
        name,
        r#type,
        short_description,
        description,
        : id NotSet,
    },
    Set
);

impl_from!(
    TagCorrection >
    tag_history::ActiveModel {
        name,
        r#type,
        short_description,
        description,
        : id NotSet,
    },
    Set
);

#[derive(Clone, Serialize, Deserialize, ToSchema)]
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

macro_rules! impl_alt_name {
    ($($type:ty),+) => {
        $(
            impl From<$type> for AltName {
                fn from(val: $type) -> Self {
                    if val.is_origin_language {
                        Self::Alternative { name: val.name }
                    } else {
                        Self::Translation {
                            name: val.name,
                            // TODO: try from?
                            language_id: val.language_id.expect("language_id is not null"),
                        }
                    }
                }
            }
        )+
    };
}

impl_alt_name!(
    tag_alternative_name::Model,
    tag_alternative_name_history::Model
);

#[derive(Clone, Serialize, Deserialize, ToSchema)]
pub struct TagRelation {
    pub related_tag_id: i32,
    pub r#type: TagRelationType,
}

impl_from!(
    TagRelation >
    tag_relation::ActiveModel {
        related_tag_id,
        r#type,
        : tag_id NotSet
    },
    Set
);

impl_from!(
    TagRelation >
    tag_relation_history::ActiveModel {
        related_tag_id,
        r#type,
        : history_id NotSet
    },
    Set
);

impl_from!(
    tag_relation::Model
        > TagRelation {
            related_tag_id,
            r#type,
        }
);

impl_from!(
    tag_relation_history::Model
        > TagRelation {
            related_tag_id,
            r#type,
        }
);
