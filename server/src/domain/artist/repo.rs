use super::model::{Artist, NewArtist};
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Artist>, Self::Error>;

    async fn find_by_name(
        &self,
        name: &str,
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
