use entity::enums::ReleaseType;
use serde::Serialize;
use utoipa::ToSchema;

use super::repository::{Connection, Cursor, Paginated};
use super::shared::model::{CreditRole, DateWithPrecision};
use crate::infra;

pub type Appearance = Discography;

#[derive(Serialize, ToSchema)]
pub struct Credit {
    pub title: String,
    pub artist: Vec<ArtistReleaseArtist>,
    pub cover_url: Option<String>,
    pub release_date: Option<DateWithPrecision>,
    pub release_type: ReleaseType,
    pub roles: Vec<CreditRole>,
}

#[derive(Serialize, ToSchema)]
pub struct Discography {
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

// Queries

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

pub trait Repo: Connection {
    async fn appearance(
        &self,
        query: AppearanceQuery,
    ) -> infra::Result<Paginated<Appearance>>;

    async fn credit(
        &self,
        query: CreditQuery,
    ) -> infra::Result<Paginated<Credit>>;

    async fn discography(
        &self,
        query: DiscographyQuery,
    ) -> infra::Result<Paginated<Discography>>;
}
