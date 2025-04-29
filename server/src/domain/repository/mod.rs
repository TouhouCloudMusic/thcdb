use std::sync::Arc;

// TODO: transaction manager?
pub trait RepositoryTrait: Send + Sync {
    type Conn: Send;
    type Error: Send;

    fn conn(&self) -> &Self::Conn;
}

pub trait TransactionRepositoryTrait: RepositoryTrait {
    async fn commit(self) -> Result<(), Self::Error>;
}

pub trait TransactionManager: RepositoryTrait {
    type TransactionRepository: TransactionRepositoryTrait;

    async fn begin_transaction(
        &self,
    ) -> Result<Self::TransactionRepository, Self::Error>;
    async fn commit_transaction(
        &self,
        transaction: Self::TransactionRepository,
    ) -> Result<(), Self::Error>;
}

impl<T> RepositoryTrait for Arc<T>
where
    T: RepositoryTrait,
{
    type Conn = T::Conn;

    type Error = T::Error;

    fn conn(&self) -> &Self::Conn {
        self.as_ref().conn()
    }
}
