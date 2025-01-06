use sea_orm::{DatabaseConnection, TransactionTrait};

use crate::error::GeneralRepositoryError;
use crate::repo;

pub struct Service {
    db: DatabaseConnection,
}

impl Service {
    pub const fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn approve(
        &self,
        correction_id: i32,
        approver_id: i32,
    ) -> Result<(), GeneralRepositoryError> {
        let transaction = self.db.begin().await?;
        let tx = &transaction;

        repo::correction::approve(correction_id, approver_id, tx).await?;

        transaction.commit().await?;

        Ok(())
    }
}
