use entity::{
    release_disc, release_disc_history, release_track, release_track_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};
use vecmap::VecMap;

use crate::domain::release::model::NewDisc;

pub(crate) async fn create_release_disc(
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

pub(crate) async fn create_release_disc_history(
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

pub(crate) async fn update_release_track_and_disc(
    release_id: i32,
    history_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_track::Entity::delete_many()
        .filter(release_track::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;
    release_disc::Entity::delete_many()
        .filter(release_disc::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    let disc_histories = release_disc_history::Entity::find()
        .filter(release_disc_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let track_histories = release_track_history::Entity::find()
        .filter(release_track_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    let id_idx_map = disc_histories
        .iter()
        .enumerate()
        .map(|(i, d)| (d.id, i))
        .collect::<VecMap<_, _>>();

    let new_discs = sea_orm::Insert::many(disc_histories.into_iter().map(
        |mut disc_history| {
            let name = std::mem::take(&mut disc_history.name);
            release_disc::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                name: Set(name),
            }
        },
    ))
    .exec_with_returning_many(db)
    .await?;

    let track_models = track_histories
        .into_iter()
        .map(|track_history| {
            let disc_id = id_idx_map
                .get(&track_history.disc_history_id)
                .and_then(|idx| new_discs.get(*idx))
                .expect("The disc should be exist in history")
                .id;

            release_track::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                song_id: Set(track_history.song_id),
                track_number: Set(track_history.track_number),
                display_title: Set(track_history.display_title),
                duration: Set(track_history.duration),
                disc_id: Set(disc_id),
            }
        })
        .collect_vec();

    release_track::Entity::insert_many(track_models)
        .exec(db)
        .await?;

    Ok(())
}
