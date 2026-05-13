use crate::features::tag::model::NewTag;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{SeaOrmTxRepo, tag as tag_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, correction: &NewTag) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        correction: &NewTag,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    tag_impls::create_tag_impl(data, repo.conn())
        .await
        .map(|tag| tag.id)
        .db_operation("create tag")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewTag,
) -> Result<i32, DatabaseError> {
    tag_impls::create_history_impl(data, repo.conn())
        .await
        .map(|tag| tag.id)
        .db_operation("create tag history")
}
