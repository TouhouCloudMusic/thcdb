use entity::enums::EntityType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::artist::model::SimpleArtist;
use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::{
    CreditRole, EntityIdent, Language, NewLocalizedName,
};

#[serde_with::apply(
    _ => #[serde(skip_serializing_if = "crate::utils::Serializable::should_skip")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Song {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub credits: Vec<SongCredit>,
    pub languages: Vec<Language>,
    pub localized_titles: Vec<LocalizedTitle>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongCredit {
    pub artist: SimpleArtist,
    pub role: CreditRole,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct LocalizedTitle {
    pub language: Language,
    pub title: String,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSong {
    pub title: EntityIdent,
    pub credits: Option<Vec<NewSongCredit>>,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<NewLocalizedName>>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}

impl CorrectionEntity for NewSong {
    fn entity_type() -> EntityType {
        EntityType::Song
    }
}
