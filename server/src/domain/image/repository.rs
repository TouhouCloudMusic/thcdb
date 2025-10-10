use super::{Image, NewImage};
use crate::domain::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(
        &self,
        id: i32,
    ) -> Result<Option<Image>, Box<dyn std::error::Error + Send + Sync>>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Box<dyn std::error::Error + Send + Sync>>;
}

pub trait TxRepo: Transaction + Repo {
    async fn create(
        &self,
        new_image: &NewImage,
    ) -> Result<Image, Box<dyn std::error::Error + Send + Sync>>;

    async fn delete(
        &self,
        id: i32,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
