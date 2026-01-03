use sea_orm::DbErr;

use crate::features::tag::model::NewTag;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, tag as tag_impls};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DbErr> {
    Ok(tag_impls::create_tag_impl(data, repo.conn()).await?.id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DbErr> {
    Ok(tag_impls::create_history_impl(data, repo.conn()).await?.id)
}
