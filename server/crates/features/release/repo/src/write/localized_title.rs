use domain::shared::NewLocalizedTitle;
use entity::{release_localized_title, release_localized_title_history};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::Set;
use sea_orm::{DbErr, EntityTrait};

pub(super) async fn create_release_localized_title(
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

pub(super) async fn create_release_localized_title_history(
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
