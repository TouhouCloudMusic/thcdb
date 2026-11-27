use entity::{release_credit, release_credit_history};
use infra_db::DatabaseTransaction;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DbErr, EntityTrait};

use super::NewCredit;

pub(super) async fn create_release_credit(
    release_id: i32,
    credits: &[NewCredit],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let models = credits
        .iter()
        .map(|credit| release_credit::ActiveModel {
            id: NotSet,
            release_id: Set(release_id),
            artist_id: Set(credit.artist_id),
            role_id: Set(credit.role_id),
            on: Set(credit.on.clone().into()),
        })
        .collect::<Vec<_>>();

    release_credit::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

pub(super) async fn create_release_credit_history(
    history_id: i32,
    credits: &[NewCredit],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let models = credits
        .iter()
        .map(|credit| release_credit_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            artist_id: Set(credit.artist_id),
            role_id: Set(credit.role_id),
            on: Set(credit.on.clone().into()),
        })
        .collect::<Vec<_>>();

    release_credit_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}
