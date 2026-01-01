use sea_orm::DbErr;

use crate::features::event::model::NewEvent;
use crate::infra::database::sea_orm::event as event_impls;
use crate::infra::database::sea_orm::SeaOrmTxRepo;

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
    Ok(event_impls::create_event_history_and_relations(data, repo.conn())
        .await?
        .id)
}
