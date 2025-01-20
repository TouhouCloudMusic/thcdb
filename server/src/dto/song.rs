use entity::{song, song_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveValue;

use super::correction;

pub struct NewSong {
    pub title: String,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<LocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: correction::Metadata,
}

pub type LocalizedTitle = super::release::input::LocalizedTitle;

impl From<&NewSong> for song::ActiveModel {
    fn from(value: &NewSong) -> Self {
        Self {
            id: NotSet,
            title: Set(value.title.clone()),
        }
    }
}

impl From<&NewSong> for song_history::ActiveModel {
    fn from(value: &NewSong) -> Self {
        Self {
            id: NotSet,
            title: value.title.clone().into_active_value(),
        }
    }
}

pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
