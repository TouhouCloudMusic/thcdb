use entity::{release_disc, release_disc_history};
use infra_db::DatabaseTransaction;
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DbErr, EntityTrait};

use super::NewDisc;

pub(super) async fn create_release_disc(
    release_id: i32,
    discs: &[NewDisc],
    db: &DatabaseTransaction,
) -> Result<Vec<release_disc::Model>, DbErr> {
    if discs.is_empty() {
        return Ok(vec![]);
    }

    let models = discs
        .iter()
        .map(|disc| release_disc::ActiveModel {
            id: NotSet,
            release_id: Set(release_id),
            name: Set(disc.name.clone()),
        })
        .collect_vec();

    let inserted = release_disc::Entity::insert_many(models)
        .exec_with_returning_many(db)
        .await?;

    Ok(inserted)
}

pub(super) async fn create_release_disc_history(
    history_id: i32,
    discs: &[NewDisc],
    db: &DatabaseTransaction,
) -> Result<Vec<release_disc_history::Model>, DbErr> {
    if discs.is_empty() {
        return Ok(vec![]);
    }

    let models = discs
        .iter()
        .map(|disc| release_disc_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            name: Set(disc.name.clone()),
        })
        .collect_vec();

    let inserted = release_disc_history::Entity::insert_many(models)
        .exec_with_returning_many(db)
        .await?;

    Ok(inserted)
}
