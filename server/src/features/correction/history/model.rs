use serde::{Deserialize, Serialize};
use user_core::UserSummary;
use utoipa::{IntoParams, ToSchema};

#[derive(Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub(super) enum EntityTypePath {
    Artist,
    Label,
    Release,
    Song,
    Tag,
    Event,
    SongLyrics,
    CreditRole,
}

impl From<EntityTypePath> for entity::enums::EntityType {
    fn from(value: EntityTypePath) -> Self {
        match value {
            EntityTypePath::Artist => Self::Artist,
            EntityTypePath::Label => Self::Label,
            EntityTypePath::Release => Self::Release,
            EntityTypePath::Song => Self::Song,
            EntityTypePath::Tag => Self::Tag,
            EntityTypePath::Event => Self::Event,
            EntityTypePath::SongLyrics => Self::SongLyrics,
            EntityTypePath::CreditRole => Self::CreditRole,
        }
    }
}

#[derive(Deserialize, IntoParams, ToSchema)]
pub(super) struct EntityCorrectionsPath {
    #[param(inline)]
    pub(super) entity_type: EntityTypePath,
    pub(super) id: i32,
}

#[derive(Serialize, ToSchema)]
pub(super) struct CorrectionHistoryItem {
    pub(super) id: i32,
    pub(super) r#type: entity::enums::CorrectionType,
    pub(super) created_at: chrono::DateTime<chrono::FixedOffset>,
    pub(super) handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub(super) author: UserSummary,
    pub(super) description: String,
}
