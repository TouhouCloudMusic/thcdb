use entity::enums::ReleaseType;
use serde::Serialize;
use utoipa::ToSchema;

use super::repository::{Connection, Cursor, Paginated};
use super::shared::model::DateWithPrecision;
use crate::domain::credit_role::CreditRoleRef;

pub type Appearance = Discography;

#[derive(Serialize, ToSchema)]
pub struct Credit {
    pub title: String,
    pub artist: Vec<ArtistReleaseArtist>,
    pub cover_url: Option<String>,
    pub release_date: Option<DateWithPrecision>,
    pub release_type: ReleaseType,
    pub roles: Vec<CreditRoleRef>,
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
    ) -> Result<Paginated<Appearance>, Box<dyn std::error::Error + Send + Sync>>;

    async fn credit(
        &self,
        query: CreditQuery,
    ) -> Result<Paginated<Credit>, Box<dyn std::error::Error + Send + Sync>>;

    async fn discography(
        &self,
        query: DiscographyQuery,
    ) -> Result<Paginated<Discography>, Box<dyn std::error::Error + Send + Sync>>;
}
