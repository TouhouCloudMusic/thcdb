use super::model::{Label, NewLabel};
use crate::domain::repository::{Connection, Transaction};

pub trait Repo: Connection {
    async fn find_by_id(&self, id: i32) -> Result<Option<Label>, Self::Error>;

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Label>, Self::Error>;
}

pub trait TxRepo: Repo + Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewLabel) -> Result<i32, Self::Error>;

    async fn create_history(&self, data: &NewLabel)
    -> Result<i32, Self::Error>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error>;
}
