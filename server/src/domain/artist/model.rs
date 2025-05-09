use axum::http::StatusCode;
use boolinator::Boolinator;
use derive_more::{Display, Error};
use entity::enums::EntityType;
pub use entity::sea_orm_active_enums::ArtistType;
use macros::{ApiError, cmp_chain};
use serde::{Deserialize, Serialize};
use url::Url;
use utoipa::ToSchema;

use crate::domain::correction::CorrectionEntity;
use crate::domain::share::model::{
    CreditRole, DateWithPrecision, EntityIdent, LocalizedName, Location,
    NewLocalizedName,
};

#[cfg(test)]
mod test;

#[derive(Debug, Display, Error, PartialEq, Eq, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST
)]
pub enum ValidationError {
    #[display("Unknown type artist cannot have members")]
    UnknownTypeArtistHasMembers,
    #[display("Invalid tenure")]
    InvalidTenure,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[expect(clippy::struct_field_names, reason = "type is a keyword")]
pub struct Artist {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Aliases without own page
    pub text_aliases: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Birthday for individuals, founding date for groups
    pub start_date: Option<DateWithPrecision>,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Death date for individuals, disbandment date for groups
    pub end_date: Option<DateWithPrecision>,

    #[serde(skip_serializing_if = "Option::is_none")]
    /// Profile image of artist
    pub profile_image_url: Option<String>,

    /// List of id of artist aliases
    pub aliases: Vec<i32>,
    pub links: Vec<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub localized_names: Vec<LocalizedName>,

    #[serde(skip_serializing_if = "Location::is_empty")]
    pub start_location: Location,
    #[serde(skip_serializing_if = "Location::is_empty")]
    pub current_location: Location,

    #[serde(skip_serializing_if = "Vec::is_empty")]
    /// Groups list for individuals, member list for groups,
    pub memberships: Vec<Membership>,
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

    pub links: Option<Vec<Url>>,
    pub localized_names: Option<Vec<NewLocalizedName>>,

    pub start_location: Option<Location>,
    pub current_location: Option<Location>,

    /// Groups list for individuals, member list for groups,
    pub memberships: Option<Vec<NewMembership>>,
}

impl NewArtist {
    pub fn validate(&self) -> Result<(), ValidationError> {
        validate_artist_type_and_membership(
            self.artist_type,
            self.memberships.as_ref(),
        )?;

        if let Some(memberships) = &self.memberships {
            for membership in memberships {
                validate_tenure(&membership.tenure)?;
            }
        }

        Ok(())
    }
}

impl CorrectionEntity for NewArtist {
    fn entity_type(&self) -> EntityType {
        EntityType::Artist
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Membership {
    pub artist_id: i32,
    pub roles: Vec<CreditRole>,
    pub tenure: Vec<Tenure>,
}

#[derive(Deserialize, ToSchema)]
pub struct NewMembership {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub tenure: Vec<Tenure>,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, ToSchema)]
pub struct Tenure {
    pub join_year: Option<i16>,
    pub leave_year: Option<i16>,
}

fn validate_artist_type_and_membership(
    artist_type: ArtistType,
    membership: Option<&Vec<NewMembership>>,
) -> Result<(), ValidationError> {
    if artist_type.is_unknown() && membership.is_some_and(|x| !x.is_empty()) {
        Err(ValidationError::UnknownTypeArtistHasMembers)
    } else {
        Ok(())
    }
}

fn validate_tenure(tenures: &[Tenure]) -> Result<(), ValidationError> {
    fn validate_tenure_body(tenures: &[Tenure]) -> Result<(), ValidationError> {
        tenures.windows(2).all(|x| {
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
                cmp_chain!(first_join < first_leave < second_join < second_leave)
            } else {
                false
            }
        }).ok_or(ValidationError::InvalidTenure)
    }

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
            .ok_or(ValidationError::InvalidTenure)
        }
        rest => validate_tenure_body(rest),
    }
}
