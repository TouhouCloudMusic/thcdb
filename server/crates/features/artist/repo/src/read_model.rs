use domain::credit_role::CreditRoleRef;
use domain::shared::{
    DateWithPrecision, LocalizedName, Location, SimpleArtist,
};
use entity::sea_orm_active_enums::ArtistType;
use serde::Serialize;
use utoipa::ToSchema;

use crate::write::Tenure;

#[serde_with::apply(
    Vec => #[serde(skip_serializing_if = "Vec::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct Membership {
    pub artist: SimpleArtist,
    pub roles: Vec<CreditRoleRef>,
    pub tenure: Vec<Tenure>,
}

#[serde_with::apply(
    Vec      => #[serde(skip_serializing_if = "Vec::is_empty")],
    Option   => #[serde(skip_serializing_if = "Option::is_none")],
    Location => #[serde(skip_serializing_if = "Location::is_empty")],
)]
#[derive(Clone, Debug, Serialize, ToSchema)]
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

    /// Artists with their own page that are aliases of this artist
    pub aliases: Vec<SimpleArtist>,
    pub links: Vec<String>,
    pub localized_names: Vec<LocalizedName>,

    pub start_location: Location,
    pub current_location: Location,

    /// Groups list for individuals, member list for groups,
    pub memberships: Vec<Membership>,
}
