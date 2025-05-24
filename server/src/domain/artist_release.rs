use entity::enums::ReleaseType;
use serde::Serialize;
use utoipa::ToSchema;

use super::repository::{Connection, Cursored, Pagination};
use super::shared::model::DateWithPrecision;
use crate::infra;

#[derive(Serialize, ToSchema)]
pub struct ArtistRelease {
    pub title: String,
    pub artist: Vec<ArtistReleaseArtist>,
    pub release_date: Option<DateWithPrecision>,
}

#[derive(Serialize, ToSchema)]
pub struct ArtistReleaseArtist {
    pub id: i32,
    pub name: String,
}

// Queries

pub struct AppearanceQuery {
    pub artist_id: i32,
    pub pagination: Pagination,
}

pub struct CreditQuery {
    pub artist_id: i32,
    pub pagination: Pagination,
}

pub struct DiscographyQuery {
    pub artist_id: i32,
    pub release_type: ReleaseType,
    pub pagination: Pagination,
}

pub trait Repo: Connection {
    async fn appearance(
        &self,
        query: AppearanceQuery,
    ) -> infra::Result<Cursored<ArtistRelease>>;

    async fn credit(
        &self,
        query: CreditQuery,
    ) -> infra::Result<Cursored<ArtistRelease>>;

    async fn discography(
        &self,
        query: DiscographyQuery,
    ) -> infra::Result<Cursored<ArtistRelease>>;
}
