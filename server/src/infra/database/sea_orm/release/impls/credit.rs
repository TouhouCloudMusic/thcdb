use entity::{release_credit, release_credit_history};
// kept for consistency if later extended
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};

use crate::domain::release::NewCredit;

pub(crate) async fn create_release_credit(
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
            on: Set(credit.on.clone()),
        })
        .collect::<Vec<_>>();

    release_credit::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

pub(crate) async fn create_release_credit_history(
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
            on: Set(credit.on.clone()),
        })
        .collect::<Vec<_>>();

    release_credit_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn update_release_credit(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing credits
    release_credit::Entity::delete_many()
        .filter(release_credit::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get credits from history
    let credits = release_credit_history::Entity::find()
        .filter(release_credit_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|x| NewCredit {
            artist_id: x.artist_id,
            role_id: x.role_id,
            on: x.on,
        })
        .collect::<Vec<_>>();

    if credits.is_empty() {
        return Ok(());
    }

    // Create new credits
    create_release_credit(release_id, &credits, db).await
}
