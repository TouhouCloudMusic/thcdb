use sea_orm::DbErr;

use crate::features::tag::model::NewTag;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, tag as tag_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        correction: &NewTag,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        correction: &NewTag,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

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
