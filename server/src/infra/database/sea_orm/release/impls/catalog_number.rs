use entity::{release_catalog_number, release_catalog_number_history};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};

use crate::domain::release::NewCatalogNumber;

pub(crate) async fn create_release_catalog_number(
    release_id: i32,
    catalog_nums: &[NewCatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if catalog_nums.is_empty() {
        return Ok(());
    }

    let models = catalog_nums
        .iter()
        .map(|data| release_catalog_number::ActiveModel {
            id: NotSet,
            release_id: Set(release_id),
            label_id: Set(data.label_id),
            catalog_number: Set(data.catalog_number.clone()),
        })
        .collect_vec();

    release_catalog_number::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn create_release_catalog_number_history(
    history_id: i32,
    catalog_nums: &[NewCatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if catalog_nums.is_empty() {
        return Ok(());
    }

    let models = catalog_nums
        .iter()
        .map(|data| release_catalog_number_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            label_id: Set(data.label_id),
            catalog_number: Set(data.catalog_number.clone()),
        })
        .collect_vec();

    release_catalog_number_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn update_release_catalog_number(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing catalog numbers
    release_catalog_number::Entity::delete_many()
        .filter(release_catalog_number::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get catalog numbers from history
    let catalog_nums = release_catalog_number_history::Entity::find()
        .filter(
            release_catalog_number_history::Column::HistoryId.eq(history_id),
        )
        .all(db)
        .await?
        .into_iter()
        .map(|x| NewCatalogNumber {
            catalog_number: x.catalog_number,
            label_id: x.label_id,
        })
        .collect_vec();

    if catalog_nums.is_empty() {
        return Ok(());
    }

    // Create new catalog numbers
    create_release_catalog_number(release_id, &catalog_nums, db).await
}
