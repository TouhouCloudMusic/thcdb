use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{release, release_history, song, song_history};
use input::{NewCredit, NewLocalizedTitle};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveValue;
use sea_orm::prelude::Date;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Clone, Deserialize, ToSchema)]
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

#[derive(Clone, ToSchema, Deserialize)]
pub enum NewTrack {
    Linked(#[schema(inline)] Linked),
    Unlinked(#[schema(inline)] Unlinked),
}

macro_rules! inherit_track_base {
    ($name:ident { $($vis:vis $field:ident: $ftype:ty),* $(,)? }) => {
        #[serde_with::serde_as]
        #[derive(Clone, ToSchema, Deserialize)]
        pub struct $name {
            pub artists: Vec<i32>,
            pub track_number: Option<String>,
            #[serde_as(as = "Option<serde_with::DurationSeconds<i64>>")]
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
            title: Set(value.display_title.clone()),
        }
    }
}

impl From<&Unlinked> for song_history::ActiveModel {
    fn from(value: &Unlinked) -> Self {
        Self {
            id: NotSet,
            title: Set(value.display_title.clone()),
        }
    }
}

pub mod input {
    use entity::{release_localized_title, release_localized_title_history};
    use macros::impl_from;
    use sea_orm::ActiveValue::{NotSet, Set};
    use serde::Deserialize;
    use utoipa::ToSchema;
    #[derive(Clone, ToSchema, Deserialize)]
    pub struct NewLocalizedTitle {
        pub title: String,
        pub language_id: i32,
    }

    impl_from!(NewLocalizedTitle > release_localized_title::Model {
        title,
        language_id,
        : release_id Default::default(),
    });

    impl_from!(
        NewLocalizedTitle >
        release_localized_title_history::Model {
            title,
            language_id,
            : history_id Default::default(),
        }
    );

    impl_from!(
        NewLocalizedTitle >
        release_localized_title::ActiveModel {
            title,
            language_id,
            : release_id NotSet
        },
        Set
    );

    impl_from!(
        NewLocalizedTitle >
        release_localized_title_history::ActiveModel {
            title,
            language_id,
            : history_id NotSet
        },
        Set
    );

    #[derive(Clone, ToSchema, Deserialize)]
    pub struct NewCredit {
        pub artist_id: i32,
        pub role_id: i32,
        pub on: Option<Vec<i16>>,
    }
}
