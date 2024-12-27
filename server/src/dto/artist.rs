use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use entity::{artist, artist_history};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::*;

use crate::types::Pair;

#[allow(dead_code)]
#[derive(bon::Builder, Clone)]
pub struct GeneralArtistDto {
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub members: Option<Vec<NewGroupMember>>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,
    pub aliases: Option<Vec<i32>>,
    pub links: Option<Vec<String>>,
    pub author_id: i32,
    pub description: String,
}

impl From<&GeneralArtistDto> for artist::ActiveModel {
    fn from(value: &GeneralArtistDto) -> Self {
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

impl From<&GeneralArtistDto> for artist_history::ActiveModel {
    fn from(value: &GeneralArtistDto) -> Self {
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

#[derive(Clone)]
pub struct NewGroupMember {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub join_leave: Vec<Pair<String>>,
}
