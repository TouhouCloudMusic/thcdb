mod artist;
mod artist_image_queue;
mod image;
mod image_queue;
mod user;

use std::sync::Arc;

use entity::user_role;
use sea_orm::{
    DatabaseConnection, DatabaseTransaction, DbErr, TransactionTrait,
};

use crate::domain::model::auth::UserRoleEnum;
use crate::domain::repository::{
    RepositoryTrait, TransactionManager, TransactionRepositoryTrait,
};

#[derive(Clone)]
pub struct SeaOrmRepository {
    pub conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}

impl RepositoryTrait for SeaOrmRepository {
    type Error = DbErr;

    type Conn = DatabaseConnection;

    fn conn(&self) -> &Self::Conn {
        &self.conn
    }
}

impl TransactionManager for SeaOrmRepository {
    type TransactionRepository = SeaOrmTransactionRepository;

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error> {
        let tx = self.conn.begin().await?;
        let tx = Arc::new(tx);
        Ok(Self::TransactionRepository { tx })
    }

    async fn run_transaction<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>,
    {
        run_transaction_impl(self, f).await
    }
}

#[derive(Clone)]
pub struct SeaOrmTransactionRepository {
    // Make this can be cloned
    tx: Arc<sea_orm::DatabaseTransaction>,
}

impl RepositoryTrait for SeaOrmTransactionRepository {
    type Error = DbErr;

    type Conn = DatabaseTransaction;

    fn conn(&self) -> &Self::Conn {
        &self.tx
    }
}

impl TransactionManager for SeaOrmTransactionRepository {
    type TransactionRepository = Self;

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error> {
        let save_point = self.tx.begin().await?;
        Ok(Self {
            tx: Arc::new(save_point),
        })
    }

    async fn run_transaction<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>,
    {
        run_transaction_impl(self, f).await
    }
}

impl TransactionRepositoryTrait for SeaOrmTransactionRepository {
    async fn commit(self) -> Result<(), Self::Error> {
        Arc::try_unwrap(self.tx)
            .map_err(|_| DbErr::Custom("Cannot commit transaction: multiple references to the transaction exist".to_owned()))?
            .commit()
            .await
    }
}

impl TryFrom<user_role::Model> for UserRoleEnum {
    type Error = DbErr;

    fn try_from(value: user_role::Model) -> Result<Self, Self::Error> {
        Self::try_from(value.role_id)
    }
}

async fn run_transaction_impl<C, F, T, E>(tx: &C, f: F) -> Result<T, E>
where
    C: TransactionManager,
    F: AsyncFnOnce(&C::TransactionRepository) -> Result<T, E> + Send,
    T: Send,
    E: Send
        + From<C::Error>
        + From<<C::TransactionRepository as RepositoryTrait>::Error>,
{
    let repo = tx.begin().await?;

    let ret = f(&repo).await;

    repo.commit().await?;

    ret
}
