use std::backtrace::Backtrace;

use axum::http::StatusCode;
use boolinator::Boolinator;
use derive_more::Display;
use entity::enums::EntityType;
pub use entity::sea_orm_active_enums::ArtistType;
use macros::{ApiError, cmp_chain};
use serde::Deserialize;
use url::Url;
use utoipa::ToSchema;

use super::Tenure;
use crate::domain::correction::CorrectionEntity;
use crate::domain::shared::model::{
    DateWithPrecision, EntityIdent, Location, NewLocalizedName,
};

// TODO: Generic validation error
#[derive(Debug, thiserror::Error, ApiError)]
#[error("Validation error: {kind}")]
#[api_error(
    status_code = StatusCode::BAD_REQUEST
)]
pub struct ValidationError {
    pub kind: ValidationErrorKind,
    pub backtrace: Backtrace,
}

impl From<ValidationErrorKind> for ValidationError {
    fn from(kind: ValidationErrorKind) -> Self {
        Self {
            kind,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, Display)]
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
    pub fn validate(&self) -> Result<(), ValidationError> {
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

#[derive(Deserialize, ToSchema)]
pub struct NewMembership {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub tenure: Vec<Tenure>,
}

fn validate_artist_type_and_membership(
    artist_type: ArtistType,
    membership: Option<&Vec<NewMembership>>,
) -> Result<(), ValidationError> {
    if artist_type.is_unknown() && membership.is_some_and(|x| !x.is_empty()) {
        Err(UnknownTypeArtistHasMembers.into())
    } else {
        Ok(())
    }
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
            .ok_or_else(|| InvalidTenure.into())
        }
        rest => validate_tenure_body(rest),
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
        .ok_or_else(|| InvalidTenure.into())
}
