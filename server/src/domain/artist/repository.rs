use super::model::{Artist, NewArtist};
use crate::domain::correction::NewCorrection;
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Artist>, Self::Error>;

    async fn find_by_name(
        &self,
        name: &str,
    ) -> Result<Vec<Artist>, Self::Error>;
}

pub trait TxRepo: Repo + Transaction {
    async fn create(
        &self,
        correction: NewCorrection<NewArtist>,
    ) -> Result<i32, Self::Error>;

    async fn create_history(
        &self,
        correction: &NewCorrection<NewArtist>,
    ) -> Result<i32, Self::Error>;
}
