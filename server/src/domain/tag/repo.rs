use super::model::{NewTag, Tag};
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Tag>, Self::Error>;

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Tag>, Self::Error>;
}

pub trait TxRepo: Repo + Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(&self, correction: &NewTag) -> Result<i32, Self::Error>;

    async fn create_history(
        &self,
        correction: &NewTag,
    ) -> Result<i32, Self::Error>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error>;
}
