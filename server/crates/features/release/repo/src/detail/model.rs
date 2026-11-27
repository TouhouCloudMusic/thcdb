use domain::credit_role::CreditRoleRef;
use domain::shared::{
    DateWithPrecision, LocalizedTitle, SimpleEvent, SimpleLabel,
};
use entity::sea_orm_active_enums::ReleaseType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::write::CreditScope;

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
    pub label: Option<SimpleLabel>,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseCredit {
    pub artist: ReleaseArtist,
    pub role: CreditRoleRef,
    #[schema(value_type = Option<Vec<i16>>, min_items = 1, minimum = 0, maximum = 32_767, required = true)]
    pub on: CreditScope,
}

#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct SongRef {
    pub id: i32,
    pub title: String,
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
#[derive(Clone, Debug, ToSchema, Serialize)]
#[cfg_attr(test, derive(PartialEq, Eq))]
pub struct ReleaseDisc {
    pub id: i32,
    pub name: Option<String>,
}

#[serde_with::apply(
    Vec    => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, ToSchema, Serialize)]
#[schema(as = Release)]
pub struct Release {
    pub id: i32,
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<DateWithPrecision>,
    pub recording_date_start: Option<DateWithPrecision>,
    pub recording_date_end: Option<DateWithPrecision>,
    pub cover_art_url: Option<String>,
    pub links: Vec<String>,
    pub artists: Vec<ReleaseArtist>,
    pub credits: Vec<ReleaseCredit>,
    pub catalog_nums: Vec<CatalogNumber>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub discs: Vec<ReleaseDisc>,
    pub tracks: Vec<ReleaseTrack>,
    pub events: Vec<SimpleEvent>,
}
