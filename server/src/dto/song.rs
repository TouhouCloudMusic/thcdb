use entity::{song, song_history};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use serde::Deserialize;
use utoipa::ToSchema;

use super::correction;

#[derive(ToSchema, Deserialize)]
pub struct NewSong {
    pub title: String,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<LocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: correction::Metadata,
}

pub type LocalizedTitle = super::release::input::NewLocalizedTitle;

impl_from!(
    NewSong >
    [song::ActiveModel, song_history::ActiveModel] {
        title,
        : id NotSet,
    },
    Set
);

#[derive(ToSchema, Deserialize)]
pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
