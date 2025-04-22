pub mod user;

pub trait RepositoryTrait: Send + Sync {
    type Transaction;
    type Error;
    async fn start_transaction(&self)
    -> Result<Self::Transaction, Self::Error>;
    async fn commit_transaction(
        &self,
        transaction: Self::Transaction,
    ) -> Result<(), Self::Error>;
}
