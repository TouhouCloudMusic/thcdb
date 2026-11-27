use entity::{release_catalog_number, release_catalog_number_history};
use infra_db::DatabaseTransaction;
use itertools::Itertools;
use libfp::EmptyExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DbErr, EntityTrait};

use super::NewCatalogNumber;

pub(super) async fn create_release_catalog_number(
    release_id: i32,
    catalog_nums: &[NewCatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(catalog_nums) = catalog_nums.into_option() {
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
    }

    Ok(())
}

pub(super) async fn create_release_catalog_number_history(
    history_id: i32,
    catalog_nums: &[NewCatalogNumber],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(catalog_nums) = catalog_nums.into_option() {
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
    }

    Ok(())
}
