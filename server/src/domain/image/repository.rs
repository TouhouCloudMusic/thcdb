use super::{Image, ImageRef, NewImage};
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Image>, Self::Error>;

    async fn find_by_filename(
        &self,
        filename: &str,
    ) -> Result<Option<Image>, Self::Error>;

    /// Get the reference count of an image
    async fn ref_count(&self, image_id: i32) -> Result<u64, Self::Error>;
}

pub trait TxRepo: Transaction + Repo {
    async fn create(&self, new_image: &NewImage) -> Result<Image, Self::Error>;

    async fn delete(&self, id: i32) -> Result<(), Self::Error>;

    async fn create_ref(&self, image_ref: ImageRef) -> Result<(), Self::Error>;

    async fn remove_ref(&self, image_ref: ImageRef) -> Result<(), Self::Error>;
}
