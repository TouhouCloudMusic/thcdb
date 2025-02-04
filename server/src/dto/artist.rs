use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use entity::{
    artist, artist_history,
    artist_localized_name_history,
};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::{NotSet, Set};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::misc::{CreditRole, Language};
use crate::dto;

#[derive(ToSchema, Serialize)]
#[schema(
    as = Artist
)]
pub struct ArtistResponse {
    pub id: i32,
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,

    pub aliases: Vec<i32>,
    pub links: Vec<String>,
    pub localized_names: Vec<LocalizedName>,
    pub members: Vec<GroupMember>,
}

#[derive(bon::Builder, Clone, Deserialize, ToSchema)]
pub struct ArtistCorrection {
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,

    pub aliases: Option<Vec<i32>>,
    pub links: Option<Vec<String>>,
    pub localized_name: Option<Vec<NewLocalizedName>>,
    pub members: Option<Vec<NewGroupMember>>,

    pub correction_metadata: dto::correction::Metadata,
}

impl From<&ArtistCorrection> for artist::ActiveModel {
    fn from(value: &ArtistCorrection) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            artist_type: Set(value.artist_type),
            text_alias: Set(value.text_alias.clone()),
            start_date: Set(value.start_date),
            start_date_precision: Set(value.start_date_precision),
            end_date: Set(value.end_date),
            end_date_precision: Set(value.end_date_precision),
        }
    }
}

impl From<&ArtistCorrection> for artist_history::ActiveModel {
    fn from(value: &ArtistCorrection) -> Self {
        Self {
            id: NotSet,
            name: Set(value.name.clone()),
            artist_type: Set(value.artist_type),
            text_alias: Set(value.text_alias.clone()),
            start_date: Set(value.start_date),
            start_date_precision: Set(value.start_date_precision),
            end_date: Set(value.end_date),
            end_date_precision: Set(value.end_date_precision),
        }
    }
}

#[derive(Clone, ToSchema, Serialize)]
pub struct GroupMember {
    pub artist_id: i32,
    pub roles: Vec<CreditRole>,
    pub join_leave: Vec<(Option<String>, Option<String>)>,
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewGroupMember {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub join_leave: Vec<(Option<String>, Option<String>)>,
}

#[derive(Clone, ToSchema, Serialize)]
pub struct LocalizedName {
    pub language: Language,
    pub name: String,
}

#[derive(Clone, ToSchema, Deserialize)]
pub struct NewLocalizedName {
    pub language_id: i32,
    pub name: String,
}

impl From<artist_localized_name_history::Model> for NewLocalizedName {
    fn from(value: artist_localized_name_history::Model) -> Self {
        Self {
            language_id: value.language_id,
            name: value.name,
        }
    }
}
