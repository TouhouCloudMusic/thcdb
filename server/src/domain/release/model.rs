use chrono::Duration;
use entity::sea_orm_active_enums::{DatePrecision, ReleaseType};
use entity::{song, song_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Date;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::super::shared::model::{
    CreditRole, LocalizedTitle, NewLocalizedTitle,
};
use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::DateWithPrecision;
use crate::utils::traits::Serializable;

#[serde_with::apply(
    _ => #[serde(skip_serializing_if = "Serializable::should_skip")],
)]
#[derive(Clone, Debug, ToSchema, Serialize)]
#[schema(
    as = Release
)]
#[expect(clippy::struct_field_names)]
pub struct Release {
    pub id: i32,
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<Date>,
    pub release_date_precision: Option<DatePrecision>,
    pub recording_date_start: Option<Date>,
    pub recording_date_start_precision: Option<DatePrecision>,
    pub recording_date_end: Option<Date>,
    pub recording_date_end_precision: Option<DatePrecision>,
    pub cover_art_url: Option<String>,

    pub artists: Vec<ReleaseArtist>,
    pub credits: Vec<ReleaseCredit>,
    pub catalog_nums: Vec<CatalogNumber>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub tracks: Vec<i32>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
pub struct ReleaseArtist {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, ToSchema, Serialize, Deserialize)]
pub struct CatalogNumber {
    pub catalog_number: String,
    pub label_id: Option<i32>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
pub struct ReleaseCredit {
    pub artist: ReleaseArtist,
    pub role: CreditRole,
    pub on: Option<Vec<i16>>,
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct NewRelease {
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub recording_start_date: Option<DateWithPrecision>,
    pub recording_end_date: Option<DateWithPrecision>,

    pub artists: Vec<i32>,
    pub catalog_nums: Vec<CatalogNumber>,
    pub credits: Vec<NewCredit>,
    pub events: Vec<i32>,
    pub localized_titles: Vec<NewLocalizedTitle>,
    pub tracks: Vec<NewTrack>,
}

impl CorrectionEntity for NewRelease {
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Release
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

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewCredit {
    pub artist_id: i32,
    pub role_id: i32,
    pub on: Option<Vec<i16>>,
}
