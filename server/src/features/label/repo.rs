use sea_orm::DbErr;

use crate::features::label::model::NewLabel;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, label as label_impls};

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
