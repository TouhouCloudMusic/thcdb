use crate::features::event::model::NewEvent;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::infra::database::sea_orm::{SeaOrmTxRepo, event as event_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(&self, data: &NewEvent) -> Result<i32, DatabaseError>;

    async fn create_history(
        &self,
        data: &NewEvent,
    ) -> Result<i32, DatabaseError>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), DatabaseError>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    event_impls::create_event_and_relations(data, repo.conn())
        .await
        .map(|event| event.id)
        .db_operation("create event")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DatabaseError> {
    event_impls::create_event_history_and_relations(data, repo.conn())
        .await
        .map(|event| event.id)
        .db_operation("create event history")
}
