use entity::{release_event, release_event_history};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::Set;
use sea_orm::{DbErr, EntityTrait};

pub(super) async fn create_release_event(
    release_id: i32,
    events: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if events.is_empty() {
        return Ok(());
    }

    let models = events
        .iter()
        .map(|event_id| release_event::ActiveModel {
            release_id: Set(release_id),
            event_id: Set(*event_id),
        })
        .collect::<Vec<_>>();

    release_event::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

pub(super) async fn create_release_event_history(
    history_id: i32,
    events: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if events.is_empty() {
        return Ok(());
    }

    let models = events
        .iter()
        .map(|event_id| release_event_history::ActiveModel {
            history_id: Set(history_id),
            event_id: Set(*event_id),
        })
        .collect::<Vec<_>>();

    release_event_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}
