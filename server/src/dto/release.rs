use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, song, song_history};
use input::{Credit, LocalizedTitle};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{IntoActiveModel, IntoActiveValue};

pub struct GeneralReleaseDto {
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<Date>,
    pub release_date_precision: Option<DatePrecision>,
    pub recording_date_start: Option<Date>,
    pub recording_date_start_precision: Option<DatePrecision>,
    pub recording_date_end: Option<Date>,
    pub recording_date_end_precision: Option<DatePrecision>,
    pub artists: Vec<i32>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub labels: Vec<i32>,
    pub tracks: Vec<NewTrack>,
    pub credits: Vec<Credit>,
}

impl GeneralReleaseDto {
    pub fn get_release_active_model(&self) -> release::ActiveModel {
        release::ActiveModel {
            id: NotSet,
            title: Set(self.title.clone()),
            release_type: Set(self.release_type),
            release_date: Set(self.release_date),
            release_date_precision: self
                .release_date_precision
                .into_active_value(),
            recording_date_start: Set(self.recording_date_start),
            recording_date_start_precision: self
                .recording_date_start_precision
                .into_active_value(),
            recording_date_end: Set(self.recording_date_end),
            recording_date_end_precision: self
                .recording_date_end_precision
                .into_active_value(),
            created_at: NotSet,
            updated_at: NotSet,
        }
    }
}

#[derive(Clone)]
pub struct NewTrack {
    pub title: String,
    pub duration: Duration,
    pub track_number: Option<String>,

    pub artists: Vec<i32>,
}

impl IntoActiveModel<song::ActiveModel> for NewTrack {
    fn into_active_model(self) -> song::ActiveModel {
        song::ActiveModel {
            id: NotSet,
            release_id: NotSet,
            title: Set(self.title),
            duration: Set(self.duration.to_string().into()),
            track_number: self.track_number.into_active_value(),
        }
    }
}

impl IntoActiveModel<song_history::ActiveModel> for NewTrack {
    fn into_active_model(self) -> song_history::ActiveModel {
        song_history::ActiveModel {
            id: NotSet,
            release_history_id: NotSet,
            title: Set(self.title),
            duration: Set(self.duration.to_string().into()),
            track_number: self.track_number.into_active_value(),
        }
    }
}

pub mod input {
    use entity::{release_localized_title, release_localized_title_history};

    pub struct LocalizedTitle {
        pub title: String,
        pub language_id: i32,
    }

    impl From<LocalizedTitle> for release_localized_title::Model {
        #[inline]
        fn from(val: LocalizedTitle) -> Self {
            Self {
                release_id: Default::default(),
                language_id: val.language_id,
                title: val.title,
            }
        }
    }

    impl From<LocalizedTitle> for release_localized_title_history::Model {
        #[inline]
        fn from(val: LocalizedTitle) -> Self {
            Self {
                history_id: Default::default(),
                language_id: val.language_id,
                title: val.title,
            }
        }
    }

    impl From<&LocalizedTitle> for release_localized_title::Model {
        #[inline]
        fn from(val: &LocalizedTitle) -> Self {
            Self {
                release_id: Default::default(),
                language_id: val.language_id,
                title: val.title.clone(),
            }
        }
    }

    impl From<&LocalizedTitle> for release_localized_title_history::Model {
        #[inline]
        fn from(val: &LocalizedTitle) -> Self {
            Self {
                history_id: Default::default(),
                language_id: val.language_id,
                title: val.title.clone(),
            }
        }
    }

    pub struct Credit {
        pub artist_id: i32,
        pub role_id: i32,
        pub on: Option<Vec<i16>>,
    }
}
