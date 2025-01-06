use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, release_history, song, song_history};
use input::{Credit, LocalizedTitle};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveValue;

#[derive(Clone)]
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
        }
    }
}

#[derive(Clone)]
pub enum NewTrack {
    Linked(Linked),
    Unlinked(Unlinked),
}

macro_rules! inherit_track_base {
    ($name:ident { $($vis:vis $field:ident: $ftype:ty),* $(,)? }) => {
        #[derive(Clone)]
        pub struct $name {
            pub artists: Vec<i32>,
            pub track_number: Option<String>,
            pub duration: Option<Duration>,
            $($vis $field: $ftype,)*
        }
    };
}

inherit_track_base!(Unlinked {
    pub display_title: String,
});

inherit_track_base!(Linked {
    pub song_id: i32,
    pub display_title: Option<String>,
});

impl From<&Unlinked> for song::ActiveModel {
    fn from(value: &Unlinked) -> Self {
        Self {
            id: NotSet,
            release_id: NotSet,
            title: Set(value.display_title.clone()),
        }
    }
}

impl From<&Unlinked> for song_history::ActiveModel {
    fn from(value: &Unlinked) -> Self {
        Self {
            id: NotSet,
            release_history_id: NotSet,
            title: Set(value.display_title.clone()),
        }
    }
}

pub mod input {
    use entity::{release_localized_title, release_localized_title_history};
    use sea_orm::ActiveValue::{NotSet, Set};

    #[derive(Clone)]
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

    impl From<&LocalizedTitle> for release_localized_title::ActiveModel {
        fn from(val: &LocalizedTitle) -> Self {
            Self {
                release_id: NotSet,
                language_id: Set(val.language_id),
                title: Set(val.title.clone()),
            }
        }
    }

    #[derive(Clone)]
    pub struct Credit {
        pub artist_id: i32,
        pub role_id: i32,
        pub on: Option<Vec<i16>>,
    }
}
