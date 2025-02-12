use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{
    artist, label, release, release_catalog_number,
    release_catalog_number_history, release_history, song, song_history,
};
use input::NewCredit;
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::IntoActiveValue;
use sea_orm::prelude::Date;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::share::{CreditRole, LocalizedTitle, NewLocalizedTitle};

#[derive(ToSchema, Serialize)]
#[schema(
    as = Release
)]
pub struct ReleaseResponse {
    pub id: i32,
    pub release_type: ReleaseType,
    pub release_date: Option<Date>,
    pub release_date_precision: Option<DatePrecision>,
    pub recording_date_start: Option<Date>,
    pub recording_date_start_precision: Option<DatePrecision>,
    pub recording_date_end: Option<Date>,
    pub recording_date_end_precision: Option<DatePrecision>,

    pub artists: Vec<ReleaseArtist>,
    pub credits: Vec<ReleaseCredit>,
    pub catalog_nums: Vec<ReleaseCatalogNumber>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub tracks: Vec<i32>,
}

#[derive(ToSchema, Serialize)]
pub struct ReleaseArtist {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, ToSchema, Serialize, Deserialize)]
pub struct ReleaseCatalogNumber {
    pub catalog_number: String,
    pub label_id: Option<i32>,
}

#[derive(ToSchema, Serialize)]
pub struct ReleaseCredit {
    pub artist: ReleaseArtist,
    pub role: CreditRole,
    pub on: Option<Vec<i16>>,
}

#[derive(ToSchema, Serialize)]
pub struct ReleaseLabel {
    pub id: i32,
    pub name: String,
}

impl_from!(artist::Model > ReleaseArtist { id, name });
impl_from!(label::Model > ReleaseLabel { id, name });
impl_from!(
    release_catalog_number::Model
        > ReleaseCatalogNumber {
            catalog_number,
            label_id
        }
);
impl_from!(
    release_catalog_number_history::Model
        > ReleaseCatalogNumber {
            catalog_number,
            label_id
        }
);

#[derive(Clone, Deserialize, ToSchema)]
pub struct ReleaseCorrection {
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<Date>,
    pub release_date_precision: Option<DatePrecision>,
    pub recording_date_start: Option<Date>,
    pub recording_date_start_precision: Option<DatePrecision>,
    pub recording_date_end: Option<Date>,
    pub recording_date_end_precision: Option<DatePrecision>,

    pub artists: Vec<i32>,
    pub localized_titles: Vec<NewLocalizedTitle>,
    pub catalog_nums: Vec<ReleaseCatalogNumber>,
    pub tracks: Vec<NewTrack>,
    pub credits: Vec<NewCredit>,

    pub correction_metadata: super::correction::Metadata,
}

impl_from!(
    ReleaseCorrection >
    [release::ActiveModel, release_history::ActiveModel] {
        title,
        release_type,
        release_date,
        release_date_precision,
        recording_date_start,
        recording_date_start_precision,
        recording_date_end,
        recording_date_end_precision,
        : id NotSet
    },
    IntoActiveValue::into_active_value
);

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

    use serde::Deserialize;
    use utoipa::ToSchema;

    #[derive(Clone, ToSchema, Deserialize)]
    pub struct NewCredit {
        pub artist_id: i32,
        pub role_id: i32,
        pub on: Option<Vec<i16>>,
    }
}
