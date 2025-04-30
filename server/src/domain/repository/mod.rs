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

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error>;

    async fn run_transaction<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>;
}
