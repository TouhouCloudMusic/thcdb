use super::{Image, NewImage};
use crate::infra::database::error::DatabaseError;

pub trait Repo {
    async fn find_by_id(&self, id: i32)
    -> Result<Option<Image>, DatabaseError>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, DatabaseError>;
}

pub trait TxRepo: Repo {
    async fn create(
        &self,
        new_image: &NewImage,
    ) -> Result<Image, DatabaseError>;

    async fn delete(&self, id: i32) -> Result<(), DatabaseError>;
}
