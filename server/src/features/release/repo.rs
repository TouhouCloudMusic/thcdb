pub(crate) mod impls;
mod mapper;
mod tx_repo;

use infra_db::SeaOrmTxRepo;
use sea_orm::DatabaseTransaction;

use crate::features::release::model::NewRelease;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    tx_repo::create_release_with_relations(data, repo.conn())
        .await
        .db_operation("create release")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    tx_repo::create_release_history_with_relations(data, repo.conn())
        .await
        .db_operation("create release history")
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DatabaseError> {
    tx_repo::apply_update(correction, tx).await
}

pub(crate) use impls::find_many_impl;
