use crate::features::label::model::NewLabel;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{SeaOrmTxRepo, label as label_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewLabel) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewLabel,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    label_impls::save_label_and_link_relations(data, repo.conn())
        .await
        .map(|label| label.id)
        .db_operation("create label")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewLabel,
) -> Result<i32, DatabaseError> {
    label_impls::save_label_history_and_link_relations(data, repo.conn())
        .await
        .map(|label| label.id)
        .db_operation("create label history")
}
