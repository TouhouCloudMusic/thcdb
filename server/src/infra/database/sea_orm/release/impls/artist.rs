use entity::{release_artist, release_artist_history};
use itertools::Itertools;
use sea_orm::ActiveValue::Set;
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};

pub(crate) async fn create_release_artist(
    release_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if artists.is_empty() {
        return Ok(());
    }

    let models = artists
        .iter()
        .copied()
        .map(|artist_id| release_artist::ActiveModel {
            release_id: Set(release_id),
            artist_id: Set(artist_id),
        })
        .collect_vec();

    release_artist::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

pub(crate) async fn create_release_artist_history(
    history_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if artists.is_empty() {
        return Ok(());
    }

    let models = artists
        .iter()
        .copied()
        .map(|artist_id| release_artist_history::ActiveModel {
            history_id: Set(history_id),
            artist_id: Set(artist_id),
        })
        .collect_vec();

    release_artist_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}

pub(crate) async fn update_release_artist(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing artist relationships
    release_artist::Entity::delete_many()
        .filter(release_artist::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get artists from history
    let artists = release_artist_history::Entity::find()
        .filter(release_artist_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?
        .into_iter()
        .map(|x| x.artist_id)
        .collect_vec();

    if !artists.is_empty() {
        create_release_artist(release_id, &artists, db).await?;
    }

    Ok(())
}
