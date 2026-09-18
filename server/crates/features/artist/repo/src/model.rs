use domain::credit_role::CreditRoleRef;
use domain::shared::{Cursor, DateWithPrecision};
use entity::enums::ReleaseType;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub type Appearance = Discography;

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

pub struct DiscographyQuery {
    pub artist_id: i32,
    pub release_type: ReleaseType,
    pub pagination: Cursor,
}

pub struct CreditQuery {
    pub artist_id: i32,
    pub cursor: Option<crate::credits::CreditsCursor>,
    pub limit: u8,
    pub scope: ArtistCreditScope,
    pub sort: ArtistCreditSort,
    pub role_id: Option<i32>,
}

pub struct ArtistCredits {
    pub release: Vec<Credit>,
    pub song: Vec<ArtistSongCredit>,
    pub next_cursor: Option<crate::credits::CreditsCursor>,
}

#[derive(Serialize, ToSchema)]
pub struct ArtistSongCredit {
    pub song_id: i32,
    pub title: String,
    pub roles: Vec<CreditRoleRef>,
    pub primary_release_id: Option<i32>,
    pub releases: Vec<ArtistSongCreditRelease>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, ToSchema)]
pub struct Disc {
    pub index: u8,
    pub name: Option<String>,
}

#[derive(Serialize, ToSchema)]
pub struct ArtistSongCreditRelease {
    pub release_id: i32,
    pub title: String,
    pub release_date: Option<DateWithPrecision>,
    pub track_number: Option<String>,
    pub disc: Option<Disc>,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ArtistCreditScope {
    #[default]
    All,
    Release,
    Song,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ArtistCreditSort {
    #[default]
    Newest,
    Oldest,
}
