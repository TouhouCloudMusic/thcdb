use entity::sea_orm_active_enums::{ArtistType, DatePrecision};
use sea_orm::prelude::Date;

use super::link::NewLink;
use crate::types::Pair;

#[allow(dead_code)]
#[derive(bon::Builder)]
pub struct NewArtist {
    pub name: String,
    pub artist_type: ArtistType,
    pub text_alias: Option<Vec<String>>,
    pub start_date: Option<Date>,
    pub start_date_precision: Option<DatePrecision>,
    pub members: Option<Vec<NewGroupMember>>,
    pub end_date: Option<Date>,
    pub end_date_precision: Option<DatePrecision>,
    pub aliases: Option<Vec<i32>>,
    pub links: Option<Vec<NewLink>>,
    pub author_id: i32,
    pub description: String,
}

pub struct NewGroupMember {
    pub artist_id: i32,
    pub roles: Vec<i32>,
    pub join_leave: Vec<Pair<String>>,
}
