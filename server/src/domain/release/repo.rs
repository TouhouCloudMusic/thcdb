use crate::domain::Transaction;
pub trait TxRepo: Transaction
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &super::model::NewRelease,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}
