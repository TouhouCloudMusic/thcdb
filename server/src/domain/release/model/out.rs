use entity::sea_orm_active_enums::ReleaseType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::credit_role::CreditRoleRef;
use crate::domain::shared::model::{DateWithPrecision, LocalizedTitle};
use crate::domain::song::model::SongRef;

#[serde_with::apply(
    Vec    => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option => #[serde(skip_serializing_if = "Option::is_none")],
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
    pub release_date: Option<DateWithPrecision>,
    pub recording_date_start: Option<DateWithPrecision>,
    pub recording_date_end: Option<DateWithPrecision>,
    pub cover_art_url: Option<String>,

    pub artists: Vec<ReleaseArtist>,
    pub credits: Vec<ReleaseCredit>,
    pub catalog_nums: Vec<CatalogNumber>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub discs: Vec<ReleaseDisc>,
    pub tracks: Vec<ReleaseTrack>,
}

#[derive(Clone, Debug, ToSchema, Serialize, Deserialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseArtist {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, ToSchema, Serialize, Deserialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct CatalogNumber {
    pub catalog_number: String,
    pub label_id: Option<i32>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseCredit {
    pub artist: ReleaseArtist,
    pub role: CreditRoleRef,
    pub on: Option<Vec<i16>>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseTrack {
    pub id: i32,
    pub track_number: Option<String>,
    pub disc_id: i32,
    pub display_title: Option<String>,
    /// Milliseconds of this track
    pub duration: Option<i32>,
    pub song: SongRef,
    pub artists: Vec<ReleaseArtist>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SimpleRelease {
    pub id: i32,
    pub title: String,
    pub cover_art_url: Option<String>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseDisc {
    pub id: i32,
    pub name: Option<String>,
}
