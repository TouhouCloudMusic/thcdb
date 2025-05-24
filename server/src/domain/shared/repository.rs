use crate::infra::ErrorEnum;

mod pagination;
pub use pagination::*;

pub trait Connection: Send + Sync {
    type Conn: Send + Sync;
    type Error: Send + Sync + Into<ErrorEnum>;

    fn conn(&self) -> &Self::Conn;
}

pub trait Transaction: Connection {
    async fn commit(self) -> Result<(), Self::Error>;
}

pub trait TransactionManager: Connection {
    type TransactionRepository: Transaction;

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error>;

    async fn run<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>;
}
