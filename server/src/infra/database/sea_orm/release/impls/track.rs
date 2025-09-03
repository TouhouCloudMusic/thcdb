use entity::{
    release_disc, release_disc_history, release_track, release_track_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DatabaseTransaction, DbErr, EntityTrait};

use crate::domain::release::model::NewTrack;

pub async fn create_release_track(
    release_id: i32,
    tracks: &[NewTrack],
    discs: &[release_disc::Model],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if tracks.is_empty() {
        return Ok(());
    }

    let models = tracks
        .iter()
        .map(|track| {
            let disc = discs
                .get(track.disc_index as usize)
                .expect("disc_index out of range for release");
            release_track::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                song_id: Set(track.song_id),
                track_number: Set(track.track_number.clone()),
                display_title: Set(track.display_title.clone()),
                duration: Set(track.duration),
                disc_id: Set(disc.id),
            }
        })
        .collect_vec();

    release_track::Entity::insert_many(models).exec(db).await?;

    Ok(())
}

pub async fn create_release_track_history(
    history_id: i32,
    tracks: &[NewTrack],
    discs: &[release_disc_history::Model],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if tracks.is_empty() {
        return Ok(());
    }

    let models = tracks
        .iter()
        .map(|track| {
            let disc = discs
                .get(track.disc_index as usize)
                .expect("disc index out of range for release history");
            release_track_history::ActiveModel {
                id: NotSet,
                history_id: Set(history_id),
                song_id: Set(track.song_id),
                track_number: Set(track.track_number.clone()),
                display_title: Set(track.display_title.clone()),
                duration: Set(track.duration),
                disc_history_id: Set(disc.id),
            }
        })
        .collect_vec();
    release_track_history::Entity::insert_many(models)
        .exec(db)
        .await?;

    Ok(())
}
