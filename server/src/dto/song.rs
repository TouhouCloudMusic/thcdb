use entity::song;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveModel;

use super::correction;

pub struct NewSong {
    pub title: String,
    pub languages: Option<Vec<i32>>,
    pub localized_titles: Option<Vec<LocalizedTitle>>,
    pub credits: Option<Vec<NewSongCredit>>,
    pub metadata: correction::Metadata,
}

pub type LocalizedTitle = super::release::input::LocalizedTitle;

impl IntoActiveModel<song::ActiveModel> for NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title),
            release_id: NotSet,
        }
    }
}

impl IntoActiveModel<song::ActiveModel> for &NewSong {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            title: Set(self.title.clone()),
            release_id: NotSet,
        }
    }
}

pub struct NewSongCredit {
    pub artist_id: i32,
    pub role_id: i32,
}
