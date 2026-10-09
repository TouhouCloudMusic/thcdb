use entity::{
    release_disc, release_disc_history, release_track, release_track_artist,
    release_track_artist_history, release_track_history,
};
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DatabaseTransaction, DbErr, EntityTrait};

use crate::features::release::model::NewTrack;

pub(crate) async fn create_release_track(
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

    let inserted_tracks = release_track::Entity::insert_many(models)
        .exec_with_returning_many(db)
        .await?;

    let artist_models = tracks
        .iter()
        .zip_eq(inserted_tracks)
        .flat_map(|(track, inserted_track)| {
            let track_id = inserted_track.id;
            track.artists.iter().copied().map(move |artist_id| {
                release_track_artist::ActiveModel {
                    track_id: Set(track_id),
                    artist_id: Set(artist_id),
                }
            })
        })
        .collect_vec();

    if !artist_models.is_empty() {
        release_track_artist::Entity::insert_many(artist_models)
            .exec(db)
            .await?;
    }

    Ok(())
}

pub(crate) async fn create_release_track_history(
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
    let inserted_tracks = release_track_history::Entity::insert_many(models)
        .exec_with_returning_many(db)
        .await?;

    let artist_models = tracks
        .iter()
        .zip_eq(inserted_tracks)
        .flat_map(|(track, inserted_track)| {
            let track_history_id = inserted_track.id;
            track.artists.iter().copied().map(move |artist_id| {
                release_track_artist_history::ActiveModel {
                    track_history_id: Set(track_history_id),
                    artist_id: Set(artist_id),
                }
            })
        })
        .collect_vec();

    if !artist_models.is_empty() {
        release_track_artist_history::Entity::insert_many(artist_models)
            .exec(db)
            .await?;
    }

    Ok(())
}
