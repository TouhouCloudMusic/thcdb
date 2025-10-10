use super::model::NewEvent;
use crate::domain::{Connection, Transaction};

pub trait TxRepo: Connection + Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
