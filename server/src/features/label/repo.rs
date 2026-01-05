use sea_orm::DbErr;

use crate::features::label::model::NewLabel;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, label as label_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewLabel,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewLabel,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DbErr> {
    Ok(
        label_impls::save_label_and_link_relations(data, repo.conn())
            .await?
            .id,
    )
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DbErr> {
    Ok(
        label_impls::save_label_history_and_link_relations(data, repo.conn())
            .await?
            .id,
    )
}
