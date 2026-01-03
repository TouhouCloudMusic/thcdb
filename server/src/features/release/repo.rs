use sea_orm::DbErr;

use crate::features::release::model::NewRelease;
use crate::infra::database::sea_orm::SeaOrmTxRepo;
use crate::infra::database::sea_orm::release::tx_repo as release_tx;

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DbErr> {
    release_tx::create_release_with_relations(data, repo.conn()).await
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewRelease,
) -> Result<i32, DbErr> {
    release_tx::create_release_history_with_relations(data, repo.conn()).await
}
