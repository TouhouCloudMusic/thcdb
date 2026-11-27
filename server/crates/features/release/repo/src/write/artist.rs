use entity::{release_artist, release_artist_history};
use infra_db::DatabaseTransaction;
use itertools::Itertools;
use libfp::EmptyExt;
use sea_orm::ActiveValue::Set;
use sea_orm::{DbErr, EntityTrait};

pub(super) async fn create_release_artist(
    release_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(artists) = artists.into_option() {
        let models = artists
            .iter()
            .copied()
            .map(|artist_id| release_artist::ActiveModel {
                release_id: Set(release_id),
                artist_id: Set(artist_id),
            })
            .collect_vec();

        release_artist::Entity::insert_many(models).exec(db).await?;
    }

    Ok(())
}

pub(super) async fn create_release_artist_history(
    history_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if let Some(artists) = artists.into_option() {
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
    }

    Ok(())
}
