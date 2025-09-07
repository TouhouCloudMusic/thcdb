mod pagination;
pub use pagination::*;

pub trait Connection: Send + Sync {
    type Conn: Send + Sync;

    fn conn(&self) -> &Self::Conn;
}

pub trait Transaction: Send + Sync {
    async fn commit(
        self,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub trait TransactionManager: Send + Sync {
    type TransactionRepository: Transaction;

    async fn begin(
        &self,
    ) -> Result<
        Self::TransactionRepository,
        Box<dyn std::error::Error + Send + Sync>,
    >;

    async fn run<F, T>(
        &self,
        f: F,
    ) -> Result<T, Box<dyn std::error::Error + Send + Sync>>
    where
        F: AsyncFnOnce(
                &Self::TransactionRepository,
            )
                -> Result<T, Box<dyn std::error::Error + Send + Sync>>
            + Send,
        T: Send;
}
