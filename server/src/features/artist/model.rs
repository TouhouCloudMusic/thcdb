use derive_more::Display;
use domain::shared::{
    Cursor, DateWithPrecision, EntityIdent, LocalizedName, Location,
    NewLocalizedName,
};
use entity::enums::{EntityType, ReleaseType};
pub use entity::sea_orm_active_enums::ArtistType;
use macros::cmp_chain;
use serde::{Deserialize, Serialize};
use url::Url;
use utoipa::ToSchema;

use crate::features::correction::CorrectionEntity;
use crate::features::credit_role::CreditRoleRef;
use crate::shared::error::ValidationError;

pub type Appearance = Discography;

#[serde_with::apply(
    Vec      => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option   => #[serde(skip_serializing_if = "Option::is_none")],
    Location => #[serde(skip_serializing_if = "Location::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
#[expect(clippy::struct_field_names, reason = "type is a keyword")]
pub struct Artist {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    /// Aliases without own page
    pub text_aliases: Option<Vec<String>>,
    /// Birthday for individuals, founding date for groups
    pub start_date: Option<DateWithPrecision>,
    /// Death date for individuals, disbandment date for groups
    pub end_date: Option<DateWithPrecision>,

    /// Profile image of artist
    pub profile_image_url: Option<String>,

    /// List of id of artist aliases
    pub aliases: Vec<i32>,
    pub links: Vec<String>,
    pub localized_names: Vec<LocalizedName>,

    pub start_location: Location,
    pub current_location: Location,

    /// Groups list for individuals, member list for groups,
    pub memberships: Vec<Membership>,
}

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Membership {
    pub artist_id: i32,
    pub roles: Vec<CreditRoleRef>,
    pub tenure: Vec<Tenure>,
}

#[serde_with::apply(
    Option => #[serde(skip_serializing_if = "Option::is_none")],
)]
#[derive(Clone, Copy, Debug, Serialize, Deserialize, ToSchema)]
pub struct Tenure {
    pub join_year: Option<i16>,
    pub leave_year: Option<i16>,
}

type NewArtistValidationError = ValidationError<ValidationErrorKind>;

#[derive(Debug, Display, derive_more::Error)]
pub enum ValidationErrorKind {
    #[display("Unknown type artist cannot have members")]
    UnknownTypeArtistHasMembers,
    #[display("Invalid tenure")]
    InvalidTenure,
}

use ValidationErrorKind::*;

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
    pub fn validate(&self) -> Result<(), NewArtistValidationError> {
        validate_artist_type_and_membership(
            self.artist_type,
            self.memberships.as_ref(),
        )?;

        if let Some(memberships) = &self.memberships {
            for membership in memberships {
                validate_tenures(&membership.tenure)?;
            }
        }

        Ok(())
    }
}

impl CorrectionEntity for NewArtist {
    fn entity_type() -> EntityType {
        EntityType::Artist
    }
}

impl From<&entity::artist_membership_tenure::Model> for Tenure {
    fn from(value: &entity::artist_membership_tenure::Model) -> Self {
        Self {
            join_year: value.join_year,
            leave_year: value.leave_year,
        }
    }
}

#[derive(Deserialize, ToSchema)]
pub struct NewMembership {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub tenure: Vec<Tenure>,
}

#[derive(Serialize, ToSchema)]
pub struct Credit {
    pub release_id: i32,
    pub title: String,
    pub artist: Vec<ArtistReleaseArtist>,
    pub cover_url: Option<String>,
    pub release_date: Option<DateWithPrecision>,
    pub release_type: ReleaseType,
    pub roles: Vec<CreditRoleRef>,
}

#[derive(Serialize, ToSchema)]
pub struct Discography {
    pub release_id: i32,
    pub title: String,
    pub cover_url: Option<String>,
    pub artist: Vec<ArtistReleaseArtist>,
    pub release_date: Option<DateWithPrecision>,
    pub release_type: ReleaseType,
}

#[derive(Serialize, ToSchema)]
pub struct ArtistReleaseArtist {
    pub id: i32,
    pub name: String,
}

pub struct AppearanceQuery {
    pub artist_id: i32,
    pub pagination: Cursor,
}

pub struct CreditQuery {
    pub artist_id: i32,
    pub pagination: Cursor,
}

pub struct DiscographyQuery {
    pub artist_id: i32,
    pub release_type: ReleaseType,
    pub pagination: Cursor,
}

fn validate_artist_type_and_membership(
    artist_type: ArtistType,
    membership: Option<&Vec<NewMembership>>,
) -> Result<(), NewArtistValidationError> {
    if artist_type.is_unknown() && membership.is_some_and(|x| !x.is_empty()) {
        Err(UnknownTypeArtistHasMembers.into())
    } else {
        Ok(())
    }
}

fn validate_tenures(
    tenures: &[Tenure],
) -> Result<(), NewArtistValidationError> {
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
            .ok_or_else(|| InvalidTenure.into())
        }
        rest => validate_tenure_body(rest),
    }
}

fn validate_tenure_body(
    tenures: &[Tenure],
) -> Result<(), NewArtistValidationError> {
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
        .ok_or_else(|| InvalidTenure.into())
}
