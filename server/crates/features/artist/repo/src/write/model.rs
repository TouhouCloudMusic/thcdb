use derive_more::Display;
use domain::shared::{
    DateWithPrecision, EntityIdent, HttpUrl, Location, NewLocalizedName,
};
use entity::enums::ArtistType;
use macros::cmp_chain;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Copy, Debug, Serialize, Deserialize, ToSchema)]
pub struct Tenure {
    pub join_year: Option<i16>,
    pub leave_year: Option<i16>,
}

impl From<&entity::artist_membership_tenure::Model> for Tenure {
    fn from(value: &entity::artist_membership_tenure::Model) -> Self {
        Self {
            join_year: value.join_year,
            leave_year: value.leave_year,
        }
    }
}

#[derive(Debug, Display, derive_more::Error)]
pub enum ValidationError {
    #[display("Unknown type artist cannot have members")]
    UnknownTypeArtistHasMembers,
    #[display("Invalid tenure")]
    InvalidTenure,
}

use ValidationError::*;

#[derive(Deserialize, ToSchema)]
pub struct NewMembership {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub tenure: Vec<Tenure>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewArtist {
    pub name: EntityIdent,
    pub artist_type: ArtistType,

    /// List of id of artist aliases
    pub aliases: Option<Vec<i32>>,
    /// Aliases without own page
    pub text_aliases: Option<Vec<EntityIdent>>,

    /// Birthday for individuals, founding date for groups
    pub start_date: Option<DateWithPrecision>,
    /// Death date for individuals, disbandment date for groups
    pub end_date: Option<DateWithPrecision>,

    pub links: Option<Vec<HttpUrl>>,
    pub localized_names: Option<Vec<NewLocalizedName>>,

    pub start_location: Option<Location>,
    pub current_location: Option<Location>,

    /// Groups list for individuals, member list for groups,
    pub memberships: Option<Vec<NewMembership>>,
}

fn validate_artist_type_and_membership(
    artist_type: ArtistType,
    membership: Option<&[NewMembership]>,
) -> Result<(), ValidationError> {
    if artist_type.is_unknown() && membership.is_some_and(|x| !x.is_empty()) {
        Err(UnknownTypeArtistHasMembers)
    } else {
        Ok(())
    }
}

fn validate_tenure_body(tenures: &[Tenure]) -> Result<(), ValidationError> {
    tenures
        .windows(2)
        .all(|x| {
            let [first, second] = x else { unreachable!() };

            if let Tenure {
                join_year: first_join,
                leave_year: Some(first_leave),
            } = first
                && let Tenure {
                    join_year: Some(second_join),
                    leave_year: second_leave,
                } = second
            {
                let first_join = &first_join.unwrap_or_default();
                let second_leave = &second_leave.unwrap_or(i16::MAX);

                cmp_chain! {
                    first_join < first_leave < second_join < second_leave
                }
            } else {
                false
            }
        })
        .ok_or(InvalidTenure)
}

fn validate_tenures(tenures: &[Tenure]) -> Result<(), ValidationError> {
    match tenures {
        [] => Ok(()),
        [tenure] => {
            let Tenure {
                join_year,
                leave_year,
            } = tenure;

            match (join_year, leave_year) {
                (Some(join), Some(leave)) => join > leave,
                _ => true,
            }
            .ok_or(InvalidTenure)
        }
        rest => validate_tenure_body(rest),
    }
}

impl NewArtist {
    pub fn validate(&self) -> Result<(), ValidationError> {
        validate_artist_type_and_membership(
            self.artist_type,
            self.memberships.as_deref(),
        )?;

        if let Some(memberships) = &self.memberships {
            for membership in memberships {
                validate_tenures(&membership.tenure)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use serde_json::json;

    use super::NewArtist;

    #[test]
    fn unknown_artist_type_takes_precedence_over_invalid_tenure() -> Result<()>
    {
        for artist_type in ["Unknown", "Multiple"] {
            let artist: NewArtist = serde_json::from_value(json!({
                "name": "Artist",
                "artist_type": artist_type,
                "memberships": [{
                    "artist_id": 7,
                    "roles": [],
                    "tenure": [
                        {"join_year": 2000, "leave_year": 2005},
                        {"join_year": 2005, "leave_year": 2010}
                    ]
                }]
            }))?;
            assert!(matches!(
                (artist.validate(), artist_type),
                (
                    Err(super::ValidationError::UnknownTypeArtistHasMembers),
                    "Unknown"
                ) | (Err(super::ValidationError::InvalidTenure), "Multiple")
            ));
        }

        Ok(())
    }
}
