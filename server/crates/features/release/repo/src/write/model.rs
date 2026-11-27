use domain::shared::{DateWithPrecision, HttpUrl, NewLocalizedTitle};
use entity::sea_orm_active_enums::ReleaseType;
use garde::Validate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "Option<Vec<i16>>")]
pub struct CreditScope(Option<Vec<i16>>);

impl CreditScope {
    pub fn track_indices(&self) -> Option<&[i16]> {
        self.0.as_deref()
    }
}

impl From<Option<Vec<i16>>> for CreditScope {
    fn from(indices: Option<Vec<i16>>) -> Self {
        Self(indices.filter(|indices| !indices.is_empty()))
    }
}

impl From<CreditScope> for Option<Vec<i16>> {
    fn from(scope: CreditScope) -> Self {
        scope.0
    }
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewCredit {
    pub artist_id: i32,
    pub role_id: i32,
    #[serde(default)]
    #[schema(value_type = Option<Vec<i16>>, minimum = 0, maximum = 32_767)]
    pub on: CreditScope,
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

fn is_valid_credit_scope(
    tracks: &[NewTrack],
) -> impl FnOnce(&[NewCredit], &()) -> garde::Result + '_ {
    move |credits, ()| {
        for credit in credits {
            for &index in credit.on.track_indices().unwrap_or_default() {
                if usize::try_from(index)
                    .ok()
                    .is_none_or(|index| index >= tracks.len())
                {
                    return Err(garde::Error::new(format!(
                        "Credit track index {index} is out of bounds",
                    )));
                }
            }
        }

        Ok(())
    }
}

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
    #[garde(custom(is_valid_credit_scope(&self.tracks)))]
    pub credits: Vec<NewCredit>,
    #[garde(length(min = 1))]
    pub discs: Vec<NewDisc>,
    #[garde(skip)]
    pub events: Vec<i32>,
    #[garde(skip)]
    pub localized_titles: Vec<NewLocalizedTitle>,
    #[garde(skip)]
    pub links: Vec<HttpUrl>,
    #[garde(custom(is_valid_track_list(&self.discs)))]
    pub tracks: Vec<NewTrack>,
}

#[cfg(test)]
mod tests {
    use garde::Validate;
    use serde_json::json;

    use super::{NewCredit, NewRelease};

    #[test]
    fn credits_without_selected_tracks_apply_to_the_release()
    -> anyhow::Result<()> {
        for input in [
            json!({ "artist_id": 1, "role_id": 2 }),
            json!({ "artist_id": 1, "role_id": 2, "on": null }),
            json!({ "artist_id": 1, "role_id": 2, "on": [] }),
        ] {
            let credit: NewCredit = serde_json::from_value(input)?;
            assert_eq!(serde_json::to_value(credit.on)?, json!(null));
        }

        Ok(())
    }

    #[test]
    fn credit_track_indices_start_at_zero_and_stay_within_the_release()
    -> anyhow::Result<()> {
        for (index, valid) in [(0, true), (-1, false), (1, false)] {
            let release: NewRelease = serde_json::from_value(json!({
                "title": "Release",
                "release_type": "Album",
                "artists": [1],
                "catalog_nums": [],
                "credits": [{ "artist_id": 1, "role_id": 2, "on": [index] }],
                "discs": [{}],
                "events": [],
                "localized_titles": [],
                "links": [],
                "tracks": [{ "song_id": 3, "disc_index": 0, "artists": [1] }],
            }))?;

            assert_eq!(
                release.validate().is_ok(),
                valid,
                "track index {index}"
            );
        }

        Ok(())
    }
}
