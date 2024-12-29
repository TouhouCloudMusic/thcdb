use chrono::Duration;
use entity::song;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveModel;

use super::correction;

pub struct NewSong {
    pub title: String,
    pub track_number: String,
    pub duration: Option<Duration>,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<LocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: correction::NewCorrectionMetadata,
}

pub type LocalizedTitle = super::release::input::LocalizedTitle;

impl IntoActiveModel<song::ActiveModel> for NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title),
            duration: Set(self.duration.map(|d| d.to_string())),
            release_id: NotSet,
            track_number: Set(Some(self.track_number)),
        }
    }
}

impl IntoActiveModel<song::ActiveModel> for &NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title.clone()),
            duration: Set(self.duration.map(|d| d.to_string())),
            release_id: NotSet,
            track_number: Set(Some(self.track_number.clone())),
        }
    }
}

pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
