use sea_orm::DbErr;

use crate::features::event::model::NewEvent;
use crate::infra::database::sea_orm::{SeaOrmTxRepo, event as event_impls};

pub trait TxRepo
where
    Self::apply_update(..): Send,
{
    async fn create(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn create_history(
        &self,
        data: &NewEvent,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>>;

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DbErr> {
    Ok(event_impls::create_event_and_relations(data, repo.conn())
        .await?
        .id)
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewEvent,
) -> Result<i32, DbErr> {
    Ok(
        event_impls::create_event_history_and_relations(data, repo.conn())
            .await?
            .id,
    )
}
