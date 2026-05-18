use domain::shared::{
    DateWithPrecision, LocalizedTitle, NewLocalizedTitle, SimpleEvent,
    SimpleLabel,
};
use entity::sea_orm_active_enums::ReleaseType;
use garde::Validate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;
use crate::features::credit_role::CreditRoleRef;
use crate::features::song::model::SongRef;

#[derive(Clone, Validate, Deserialize, ToSchema)]
pub struct NewRelease {
    #[garde(length(min = 1))]
    pub title: String,
    #[garde(skip)]
    pub release_type: ReleaseType,
    #[garde(skip)]
    pub release_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub recording_date_start: Option<DateWithPrecision>,
    #[garde(skip)]
    pub recording_date_end: Option<DateWithPrecision>,
    #[garde(skip)]
    pub artists: Vec<i32>,
    #[garde(skip)]
    pub catalog_nums: Vec<NewCatalogNumber>,
    #[garde(skip)]
    pub credits: Vec<NewCredit>,
    #[garde(length(min = 1))]
    pub discs: Vec<NewDisc>,
    #[garde(skip)]
    pub events: Vec<i32>,
    #[garde(skip)]
    pub localized_titles: Vec<NewLocalizedTitle>,
    #[garde(custom(is_valid_track_list(&self.discs)))]
    pub tracks: Vec<NewTrack>,
}

fn is_valid_track_list(
    discs: &[NewDisc],
) -> impl FnOnce(&[NewTrack], &()) -> garde::Result + '_ {
    move |tracks, ()| {
        for (idx, track) in tracks.iter().enumerate() {
            if track.disc_index as usize >= discs.len() {
                let disc_idx = track.disc_index;

                return Err(garde::Error::new(format!(
                    "Disc index {disc_idx} of track {idx} is out of bounds",
                )));
            }
        }

        Ok(())
    }
}

impl CorrectionEntity for NewRelease {
    fn entity_type() -> entity::enums::EntityType {
        entity::enums::EntityType::Release
    }
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewCatalogNumber {
    pub catalog_number: String,
    pub label_id: Option<i32>,
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewTrack {
    pub song_id: i32,
    pub track_number: Option<String>,
    pub display_title: Option<String>,
    pub duration: Option<i32>,
    pub disc_index: u8,
    pub artists: Vec<i32>,
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewDisc {
    pub name: Option<String>,
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewCredit {
    pub artist_id: i32,
    pub role_id: i32,
    pub on: Option<Vec<i16>>,
}

#[serde_with::apply(
    Vec    => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Debug, ToSchema, Serialize)]
#[schema(as = Release)]
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
    pub events: Vec<SimpleEvent>,
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
    pub label: Option<SimpleLabel>,
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
