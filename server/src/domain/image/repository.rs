use super::{Image, NewImage};
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Image>, Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Self::Error>;
}

pub trait TxRepo: Transaction + Repo {
    async fn create(&self, new_image: &NewImage) -> Result<Image, Self::Error>;

    async fn delete(&self, id: i32) -> Result<(), Self::Error>;
}
