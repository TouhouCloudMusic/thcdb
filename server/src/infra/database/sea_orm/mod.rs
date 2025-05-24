use std::sync::Arc;

use entity::user_role;
use sea_orm::{
    DatabaseConnection, DatabaseTransaction, DbErr, TransactionTrait,
};

use crate::domain::model::auth::UserRoleEnum;
use crate::domain::repository::{Connection, Transaction, TransactionManager};

mod artist;
mod artist_image_queue;
mod artist_release;
mod correction;
pub mod enum_table;
mod event;
pub mod ext;
mod image;
mod image_queue;
mod label;
mod release;
mod song;
mod tag;
mod user;
pub mod utils;

#[derive(Clone)]
pub struct SeaOrmRepository {
    pub conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}

impl Connection for SeaOrmRepository {
    type Error = DbErr;

    type Conn = DatabaseConnection;

    fn conn(&self) -> &Self::Conn {
        &self.conn
    }
}

impl TransactionManager for SeaOrmRepository {
    type TransactionRepository = SeaOrmTxRepo;

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error> {
        let tx = self.conn.begin().await?;
        let tx = Arc::new(tx);
        Ok(Self::TransactionRepository { tx })
    }

    async fn run<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>,
    {
        run_transaction_impl(self, f).await
    }
}

#[derive(Clone)]
pub struct SeaOrmTxRepo {
    // Make this can be cloned
    tx: Arc<sea_orm::DatabaseTransaction>,
}

impl Connection for SeaOrmTxRepo {
    type Error = DbErr;

    type Conn = DatabaseTransaction;

    fn conn(&self) -> &Self::Conn {
        &self.tx
    }
}

impl TransactionManager for SeaOrmTxRepo {
    type TransactionRepository = Self;

    async fn begin(&self) -> Result<Self::TransactionRepository, Self::Error> {
        let save_point = self.tx.begin().await?;
        Ok(Self {
            tx: Arc::new(save_point),
        })
    }

    async fn run<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: AsyncFnOnce(&Self::TransactionRepository) -> Result<T, E> + Send,
        T: Send,
        E: Send + From<Self::Error>,
    {
        run_transaction_impl(self, f).await
    }
}

impl Transaction for SeaOrmTxRepo {
    async fn commit(self) -> Result<(), Self::Error> {
        Arc::try_unwrap(self.tx)
            .map_err(|tx| DbErr::Custom(format!("Cannot commit transaction: multiple references to the transaction exist, current weak count: {}, strong count: {}", Arc::weak_count(&tx), Arc::strong_count(&tx))))?
            .commit()
            .await
    }
}

// TODO: move to elsewhere
impl TryFrom<user_role::Model> for UserRoleEnum {
    type Error = DbErr;

    fn try_from(value: user_role::Model) -> Result<Self, Self::Error> {
        Self::try_from(value.role_id)
            .map_err(String::from)
            .map_err(DbErr::Custom)
    }
}

async fn run_transaction_impl<C, F, T, E>(tx: &C, f: F) -> Result<T, E>
where
    C: TransactionManager,
    F: AsyncFnOnce(&C::TransactionRepository) -> Result<T, E> + Send,
    T: Send,
    E: Send
        + From<C::Error>
        + From<<C::TransactionRepository as Connection>::Error>,
{
    let repo = tx.begin().await?;

    let ret = f(&repo).await;

    repo.commit().await?;

    ret
}
