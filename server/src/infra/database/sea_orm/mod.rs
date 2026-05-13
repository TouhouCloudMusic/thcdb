use std::sync::Arc;

use sea_orm::{DatabaseTransaction, DbErr, TransactionTrait};

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::{
    BrokenEntityReference, InternalError, MessageError,
};

pub(crate) mod artist;
mod artist_image_queue;
pub(crate) mod artist_release;
pub(crate) mod cache;
mod correction;
pub(crate) mod credit_role;
pub mod enum_table;
pub(crate) mod event;
pub mod ext;
mod image;
mod image_queue;
pub(crate) mod label;
pub(crate) mod release;
mod release_image_queue;
pub(crate) mod song;
pub(crate) mod song_lyrics;
pub(crate) mod tag;
mod user;
pub mod utils;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum ApplyCorrectionError {
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DbErr),
    #[display("{_0}")]
    #[from]
    BrokenReference(#[error(source)] BrokenEntityReference),
}

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

    pub async fn begin_tx(&self) -> Result<SeaOrmTxRepo, DatabaseError> {
        let tx = self.conn.begin().await.db_operation("begin transaction")?;
        Ok(SeaOrmTxRepo::new(tx))
    }
}

#[derive(Clone)]
pub struct SeaOrmTxRepo {
    // Make this can be cloned
    tx: Arc<sea_orm::DatabaseTransaction>,
}

impl SeaOrmTxRepo {
    pub(crate) fn new(tx: sea_orm::DatabaseTransaction) -> Self {
        Self { tx: Arc::new(tx) }
    }

    pub(crate) fn conn(&self) -> &DatabaseTransaction {
        &self.tx
    }

    pub(crate) async fn commit(self) -> Result<(), InternalError> {
        let tx = Arc::try_unwrap(self.tx).map_err(|tx| {
            let wc = Arc::weak_count(&tx);
            let sc = Arc::strong_count(&tx);
            let msg = format!(
                "Cannot commit transaction: \
                    multiple references to the transaction exist, \
                    current weak count: {wc}, strong count: {sc}"
            );
            InternalError::new(MessageError::new(msg))
        })?;

        tx.commit().await.map_err(InternalError::new)
    }
}
