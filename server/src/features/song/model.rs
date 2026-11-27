use domain::shared::{Language, LocalizedTitle, SimpleArtist};
use entity::enums::EntityType;
use rating_core::RatingSummary;
use serde::Serialize;
use song_lyrics_repo::SongLyrics;
use song_repo::read::{SongCredit, SongRelation, SongRelease};
use song_repo::write::NewSong;
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;

impl CorrectionEntity for NewSong {
    fn entity_type() -> EntityType {
        EntityType::Song
    }
}

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Song {
    pub id: i32,
    pub title: String,
    pub artists: Vec<SimpleArtist>,
    pub releases: Vec<SongRelease>,
    pub credits: Vec<SongCredit>,
    pub languages: Vec<Language>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub links: Vec<String>,
    pub relations: Vec<SongRelation>,
    pub lyrics: Vec<SongLyrics>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongDetail {
    #[serde(flatten)]
    pub song: Song,
    pub rating: RatingSummary,
}
