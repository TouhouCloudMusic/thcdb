use domain::shared::HttpUrl;
use entity::{release_link, release_link_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};
use sea_query::OnConflict;

pub(crate) async fn create_release_link(
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

pub(crate) async fn create_release_link_history(
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

pub(crate) async fn update_release_link(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_link::Entity::delete_many()
        .filter(release_link::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    let links = release_link_history::Entity::find()
        .filter(release_link_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    if links.is_empty() {
        return Ok(());
    }

    let models = links.into_iter().map(|link| release_link::ActiveModel {
        id: NotSet,
        release_id: Set(release_id),
        url: Set(link.url),
    });

    release_link::Entity::insert_many(models).exec(db).await?;

    Ok(())
}
