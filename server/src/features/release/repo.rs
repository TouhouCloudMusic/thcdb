pub(crate) mod impls;
mod mapper;
mod tx_repo;

use infra_db::{DatabaseTransaction, SeaOrmTxRepo};

use crate::features::release::model::NewRelease;
use crate::infra::database::error::DatabaseError;

#[infra_db::observe("release.create")]
pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    Ok(tx_repo::create_release_with_relations(data, repo.conn()).await?)
}

#[infra_db::observe("release.create_history")]
pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DatabaseError> {
    Ok(
        tx_repo::create_release_history_with_relations(data, repo.conn())
            .await?,
    )
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DatabaseError> {
    tx_repo::apply_update(correction, tx).await
}

pub(crate) use impls::find_many_impl;
