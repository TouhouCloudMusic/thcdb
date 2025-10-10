use entity::{release_localized_title, release_localized_title_history};
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};

use crate::domain::shared::NewLocalizedTitle;

pub(crate) async fn create_release_localized_title(
    release_id: i32,
    localized_titles: &[NewLocalizedTitle],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles
        .iter()
        .map(|title| release_localized_title::ActiveModel {
            release_id: Set(release_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        })
        .collect::<Vec<_>>();

    release_localized_title::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn create_release_localized_title_history(
    history_id: i32,
    localized_titles: &[NewLocalizedTitle],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles
        .iter()
        .map(|title| release_localized_title_history::ActiveModel {
            history_id: Set(history_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        })
        .collect::<Vec<_>>();

    release_localized_title_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn update_release_localized_title(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing localized titles
    release_localized_title::Entity::delete_many()
        .filter(release_localized_title::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get localized titles from history
    let localized_titles = release_localized_title_history::Entity::find()
        .filter(
            release_localized_title_history::Column::HistoryId.eq(history_id),
        )
        .all(db)
        .await?
        .into_iter()
        .map(|x| NewLocalizedTitle {
            language_id: x.language_id,
            title: x.title,
        })
        .collect::<Vec<_>>();

    if localized_titles.is_empty() {
        return Ok(());
    }

    // Create new localized titles
    create_release_localized_title(release_id, &localized_titles, db).await
}
