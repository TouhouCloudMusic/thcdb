pub use entity::sea_orm_active_enums::ArtistType;
use serde::Serialize;
use utoipa::ToSchema;

use crate::domain::share::model::{
    CreditRole, DateWithPrecision, LocalizedName,
};

#[derive(Clone, Debug, Serialize, ToSchema)]
#[expect(clippy::struct_field_names, reason = "type is a keyword")]
pub struct Artist {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    #[serde(skip_serializing_if = "Option::is_none")]
    /// Text alias of the artist
    pub text_alias: Option<Vec<String>>,
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
    #[serde(skip_serializing_if = "Vec::is_empty")]
    /// Groups list for individuals, member list for groups,
    pub group_association: Vec<GroupAssociation>,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct GroupAssociation {
    pub artist_id: i32,
    pub roles: Vec<CreditRole>,
    pub tenure: Vec<Tenure>,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
pub struct Tenure {
    pub join_year: Option<i16>,
    pub leave_year: Option<i16>,
}
