pub use entity::sea_orm_active_enums::ArtistType;
use macros::AutoMapper;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::shared::model::{
    DateWithPrecision, LocalizedName, Location,
};

mod new_artist;
pub use new_artist::*;

use crate::domain::credit_role::CreditRoleRef;

#[cfg(test)]
mod test;

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

#[derive(Clone, Debug, Serialize, ToSchema, AutoMapper)]
#[mapper(from(entity::artist::Model))]
pub struct SimpleArtist {
    pub id: i32,
    pub name: String,
}
