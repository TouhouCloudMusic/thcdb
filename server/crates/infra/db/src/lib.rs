#![expect(
    clippy::result_unit_err,
    reason = "crate split preserves the existing DB infrastructure API"
)]

use std::sync::Arc;

use ::sea_orm::{ConnectOptions, Database};
use sea_orm_migration::MigratorTrait;

mod connection;
mod observation;
pub use connection::{DatabaseConnection, DatabaseTransaction};
pub use infra_observability::span::trace;
pub use observation::observe;
pub use proc_macros::observe;

pub mod error;
pub mod ext;
pub mod lookup_table;

use crate::error::{DatabaseError, DatabaseFailure, DatabaseResultExt};

pub async fn get_connection(url: &str) -> DatabaseConnection {
    let opt = ConnectOptions::new(url)
        .sqlx_logging(false)
        .min_connections(1)
        .to_owned();

    Database::connect(opt).await.unwrap().into()
}

pub async fn run_migrations(conn: &DatabaseConnection) {
    trace(
        "database.migrate",
        migration::Migrator::up(&conn.inner, None),
    )
    .await
    .inspect_err(|x| println!("Failed to run migration:\n{x}"))
    .unwrap();
}

/// `DatabaseConnection` is a wrapper of Arc<InnerPool>.
/// So don't wrap this type in Arc.
#[derive(Clone)]
pub struct SeaOrmRepository {
    pub conn: DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: DatabaseConnection) -> Self {
        Self { conn }
    }

    pub async fn begin_tx(&self) -> Result<SeaOrmTxRepo, DatabaseError> {
        let tx = self.conn.begin().await.db_context("begin transaction")?;
        Ok(SeaOrmTxRepo::new(tx))
    }
}

#[derive(Clone)]
pub struct SeaOrmTxRepo {
    tx: Arc<DatabaseTransaction>,
}

impl SeaOrmTxRepo {
    fn new(tx: DatabaseTransaction) -> Self {
        Self { tx: Arc::new(tx) }
    }

    pub fn conn(&self) -> &DatabaseTransaction {
        &self.tx
    }

    pub async fn commit(self) -> Result<(), DatabaseError> {
        self.into_transaction("commit transaction")?
            .commit()
            .await
            .db_context("commit transaction")
    }

    pub async fn rollback(self) -> Result<(), DatabaseError> {
        self.into_transaction("rollback transaction")?
            .rollback()
            .await
            .db_context("rollback transaction")
    }

    fn into_transaction(
        self,
        operation: &'static str,
    ) -> Result<DatabaseTransaction, DatabaseError> {
        Arc::try_unwrap(self.tx).map_err(|tx| {
            let wc = Arc::weak_count(&tx);
            let sc = Arc::strong_count(&tx);
            let msg = format!(
                "Cannot {operation}: \
                    multiple references to the transaction exist, \
                    current weak count: {wc}, strong count: {sc}"
            );
            DatabaseFailure::internal(msg).context(operation)
        })
    }
}
