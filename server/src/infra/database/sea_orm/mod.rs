use std::sync::Arc;

use entity::user_role;
use sea_orm::{
    DatabaseConnection, DatabaseTransaction, DbErr, TransactionTrait,
};
use snafu::ResultExt;

use crate::domain::error::InfraWhatever;
use crate::domain::model::UserRoleEnum;
use crate::domain::{Connection, Transaction, TransactionManager};

mod artist;
mod artist_image_queue;
pub(crate) mod artist_release;
pub(crate) mod cache;
mod correction;
mod credit_role;
pub mod enum_table;
mod event;
pub mod ext;
mod image;
mod image_queue;
mod label;
pub(crate) mod release;
mod release_image;
mod release_image_queue;
mod song;
mod song_lyrics;
mod tag;
mod user;
pub mod utils;

/// `DatabaseConnection` is a wrapper of Arc<InnerPool>.
/// So don't wrap this type in Arc.
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
    type Conn = DatabaseConnection;

    fn conn(&self) -> &Self::Conn {
        &self.conn
    }
}

impl TransactionManager for SeaOrmRepository {
    type TransactionRepository = SeaOrmTxRepo;

    async fn begin(
        &self,
    ) -> Result<
        Self::TransactionRepository,
        Box<dyn std::error::Error + Send + Sync>,
    > {
        let tx = self.conn.begin().await?;
        let tx = Arc::new(tx);
        Ok(Self::TransactionRepository { tx })
    }

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
        T: Send,
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
    type Conn = DatabaseTransaction;

    fn conn(&self) -> &Self::Conn {
        &self.tx
    }
}

impl TransactionManager for SeaOrmTxRepo {
    type TransactionRepository = Self;

    async fn begin(
        &self,
    ) -> Result<
        Self::TransactionRepository,
        Box<dyn std::error::Error + Send + Sync>,
    > {
        let save_point = self.tx.begin().await.boxed()?;
        Ok(Self {
            tx: Arc::new(save_point),
        })
    }

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
        T: Send,
    {
        run_transaction_impl(self, f).await
    }
}

impl Transaction for SeaOrmTxRepo {
    async fn commit(
        self,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        Arc::try_unwrap(self.tx)
            .map_err(|tx| {
                let wc = Arc::weak_count(&tx);
                let sc = Arc::strong_count(&tx);
                let msg = format!(
                    "Cannot commit transaction: \
                    multiple references to the transaction exist, \
                    current weak count: {wc}, strong count: {sc}"
                );
                InfraWhatever::from(msg)
            })
            .boxed()?
            .commit()
            .await
            .boxed()?;

        Ok(())
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
    E: Send + From<Box<dyn std::error::Error + Send + Sync>>,
{
    let repo = tx.begin().await?;

    let ret = f(&repo).await;

    repo.commit().await?;

    ret
}
