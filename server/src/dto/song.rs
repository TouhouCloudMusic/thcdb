use chrono::Duration;
use entity::song;
use sea_orm::ActiveValue::*;
use sea_orm::IntoActiveModel;

use super::change_request;

pub struct NewSong {
    pub title: String,
    pub duration: Option<Duration>,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<LocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: change_request::ChangeRequestMetaData,
}

pub type LocalizedTitle = super::release::input::LocalizedTitle;

impl IntoActiveModel<song::ActiveModel> for NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title),
            duration: Set(self.duration.map(|d| d.to_string())),
            created_at: NotSet,
            updated_at: NotSet,
        }
    }
}

impl IntoActiveModel<song::ActiveModel> for &NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title.clone()),
            duration: Set(self.duration.map(|d| d.to_string())),
            created_at: NotSet,
            updated_at: NotSet,
        }
    }
}

pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
