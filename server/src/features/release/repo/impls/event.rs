use entity::{release_event, release_event_history};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::Set;
use sea_orm::{ColumnTrait, DbErr, EntityTrait, QueryFilter};

pub(crate) async fn create_release_event(
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

pub(crate) async fn create_release_event_history(
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

pub(crate) async fn update_release_event(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("release.update_event", async {
        release_event::Entity::delete_many()
            .filter(release_event::Column::ReleaseId.eq(release_id))
            .exec(db)
            .await?;

        let events = release_event_history::Entity::find()
            .filter(release_event_history::Column::HistoryId.eq(history_id))
            .all(db)
            .await?
            .into_iter()
            .map(|x| x.event_id)
            .collect::<Vec<_>>();

        if events.is_empty() {
            return Ok(());
        }

        create_release_event(release_id, &events, db).await
    })
    .await
}
