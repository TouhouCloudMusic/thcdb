use enumset::EnumSet;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};

use super::model::{Artist, ArtistType, NewArtist};
use crate::domain::repository::{Connection, Transaction};

#[derive(Clone, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum FindManyFilter {
    Keyword(String),
}

#[derive(Clone, Debug, Default, Deserialize, ToSchema, IntoParams)]
#[schema(as = ArtistCommonFilter)]
pub struct CommonFilter {
    #[schema(
        value_type = HashSet<ArtistType>
    )]
    #[param(
        value_type = HashSet<ArtistType>
    )]
    #[serde(rename = "artist_type")]
    pub artist_types: Option<EnumSet<ArtistType>>,

    #[schema(
        value_type = HashSet<i32>
    )]
    #[param(
        value_type = HashSet<i32>
    )]
    pub exclusion: Option<Vec<i32>>,
}

pub trait Repo: Connection {
    async fn find_one(
        &self,
        id: i32,
        common: CommonFilter,
    ) -> Result<Option<Artist>, Self::Error>;

    async fn find_many(
        &self,
        filter: FindManyFilter,
        common: CommonFilter,
    ) -> Result<Vec<Artist>, Self::Error>;
}

pub trait TxRepo: Repo + Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewArtist) -> Result<i32, Self::Error>;

    async fn create_history(
        &self,
        data: &NewArtist,
    ) -> Result<i32, Self::Error>;

    async fn apply_update(
        &self,
        data: entity::correction::Model,
    ) -> Result<(), Self::Error>;
}
