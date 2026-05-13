use crate::features::release::model::NewRelease;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::release::tx_repo as release_tx;
use crate::infra::database::sea_orm::{ApplyCorrectionError, SeaOrmTxRepo};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewRelease) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewRelease,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), ApplyCorrectionError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    release_tx::create_release_with_relations(data, repo.conn())
        .await
        .db_operation("create release")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    release_tx::create_release_history_with_relations(data, repo.conn())
        .await
        .db_operation("create release history")
}
