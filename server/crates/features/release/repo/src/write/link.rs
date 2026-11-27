use domain::shared::HttpUrl;
use entity::{release_link, release_link_history};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DbErr, EntityTrait};
use sea_query::OnConflict;

pub(super) async fn create_release_link(
    release_id: i32,
    links: &[HttpUrl],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if links.is_empty() {
        return Ok(());
    }

    let models = links.iter().map(|link| release_link::ActiveModel {
        id: NotSet,
        release_id: Set(release_id),
        url: Set(link.to_string()),
    });

    release_link::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                release_link::Column::ReleaseId,
                release_link::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(db)
        .await?;

    Ok(())
}

pub(super) async fn create_release_link_history(
    history_id: i32,
    links: &[HttpUrl],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if links.is_empty() {
        return Ok(());
    }

    let models = links.iter().map(|link| release_link_history::ActiveModel {
        id: NotSet,
        history_id: Set(history_id),
        url: Set(link.to_string()),
    });

    release_link_history::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                release_link_history::Column::HistoryId,
                release_link_history::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(db)
        .await?;

    Ok(())
}
