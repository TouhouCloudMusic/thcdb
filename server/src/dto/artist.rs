use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use entity::{artist, artist_history};
use macros::impl_from;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::prelude::Date;
use serde::Deserialize;
use utoipa::ToSchema;

use crate::domain::share::model::NewLocalizedName;
use crate::dto;

#[derive(bon::Builder, Clone, Deserialize, ToSchema)]
pub struct ArtistCorrection {
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    /// Birth date for a person and formation date for a group
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    /// Death date for a person and disbandment date for a group
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,

    pub location_country: Option<String>,
    pub location_province: Option<String>,
    pub location_city: Option<String>,

    pub profile_image_id: Option<i32>,

    /// List of Ids of the artist's aliases
    pub aliases: Option<Vec<i32>>,
    /// List of artist-related URLs
    pub links: Option<Vec<String>>,
    pub localized_name: Option<Vec<NewLocalizedName>>,
    pub members: Option<Vec<NewGroupMember>>,

    pub correction_metadata: dto::correction::Metadata,
}

impl_from!(
    ArtistCorrection >
    [artist::ActiveModel, artist_history::ActiveModel] {
        name,
        artist_type,
        text_alias,
        start_date,
        start_date_precision,
        end_date,
        end_date_precision,
        location_country,
        location_province,
        location_city,

        : id NotSet,
    },
    Set
);

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewGroupMember {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub join_leave: Vec<(Option<i16>, Option<i16>)>,
}
