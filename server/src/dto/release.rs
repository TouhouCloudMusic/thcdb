use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, release_history, song, song_history};
use input::{Credit, LocalizedTitle};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{IntoActiveModel, IntoActiveValue};

pub struct GeneralRelease {
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

impl From<&GeneralRelease> for release::ActiveModel {
    fn from(val: &GeneralRelease) -> Self {
        Self {
            id: NotSet,
            title: Set(val.title.clone()),
            release_type: Set(val.release_type),
            release_date: Set(val.release_date),
            release_date_precision: val
                .release_date_precision
                .into_active_value(),
            recording_date_start: Set(val.recording_date_start),
            recording_date_start_precision: val
                .recording_date_start_precision
                .into_active_value(),
            recording_date_end: Set(val.recording_date_end),
            recording_date_end_precision: val
                .recording_date_end_precision
                .into_active_value(),
            created_at: NotSet,
            updated_at: NotSet,
        }
    }
}

impl From<&GeneralRelease> for release_history::ActiveModel {
    fn from(value: &GeneralRelease) -> Self {
        Self {
            id: NotSet,
            title: Set(value.title.clone()),
            release_type: Set(value.release_type),
            release_date: Set(value.release_date),
            release_date_precision: value
                .release_date_precision
                .into_active_value(),
            recording_date_start: Set(value.recording_date_start),
            recording_date_start_precision: value
                .recording_date_start_precision
                .into_active_value(),
            recording_date_end: Set(value.recording_date_end),
            recording_date_end_precision: value
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
    pub artists: Vec<i32>,
    pub track_number: Option<String>,
    pub duration: Duration,
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
