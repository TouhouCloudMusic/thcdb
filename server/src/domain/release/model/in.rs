use entity::sea_orm_active_enums::ReleaseType;
use garde::Validate;
use serde::Deserialize;
use utoipa::ToSchema;

use super::CatalogNumber;
use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::{DateWithPrecision, NewLocalizedTitle};

#[derive(Clone, Validate, Deserialize, ToSchema)]
pub struct NewRelease {
    #[garde(length(min = 1))]
    pub title: String,
    #[garde(skip)]
    pub release_type: ReleaseType,
    #[garde(skip)]
    pub release_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub recording_start_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub recording_end_date: Option<DateWithPrecision>,
    #[garde(skip)]
    pub artists: Vec<i32>,
    #[garde(skip)]
    pub catalog_nums: Vec<CatalogNumber>,
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
