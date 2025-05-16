use entity::{
    release_track, release_track_artist_history, release_track_history, song,
    song_artist,
};
use itertools::{Either, Itertools};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, QueryFilter,
};

use crate::domain::release::model::{Linked, NewTrack, Unlinked};

pub async fn create_release_track(
    release_id: i32,
    tracks: &[NewTrack],
    author_id: i32,
    db: &DatabaseTransaction,
) -> Result<Vec<release_track::Model>, DbErr> {
    if tracks.is_empty() {
        return Ok(vec![]);
    }

    // Partition tracks into linked and unlinked
    let (linked, unlinked): (Vec<_>, Vec<_>) =
        tracks.iter().enumerate().partition_map(|(i, x)| match x {
            NewTrack::Linked(x) => Either::Left((i, x)),
            NewTrack::Unlinked(x) => Either::Right((i, x)),
        });

    // Create songs for unlinked tracks
    let new_songs = create_songs_for_unlinked_tracks(
        unlinked.iter().map(|(_, track)| *track),
        release_id,
        author_id,
        db,
    )
    .await?;

    // Create song-artist relationships for the new songs
    for (song, (_, track)) in new_songs.iter().zip(unlinked.iter()) {
        for artist_id in &track.artists {
            let model = song_artist::ActiveModel {
                song_id: Set(song.id),
                artist_id: Set(*artist_id),
            };
            song_artist::Entity::insert(model).exec(db).await?;
        }
    }

    // Create release tracks for both linked and unlinked tracks
    let release_track_active_models = linked
        .into_iter()
        .map(|(key, track)| {
            (
                key,
                release_track::ActiveModel {
                    id: NotSet,
                    release_id: Set(release_id),
                    song_id: Set(track.song_id),
                    track_number: Set(track.track_number.clone()),
                    display_title: Set(track.display_title.clone()),
                    duration: Set(track.duration.map(|d| d.to_string())),
                },
            )
        })
        .chain(unlinked.into_iter().zip(new_songs.iter()).map(
            |((key, track), model)| {
                (
                    key,
                    release_track::ActiveModel {
                        id: NotSet,
                        release_id: Set(release_id),
                        song_id: Set(model.id),
                        track_number: Set(track.track_number.clone()),
                        display_title: Set(Some(model.title.clone())),
                        duration: Set(track.duration.map(|d| d.to_string())),
                    },
                )
            },
        ))
        .sorted_by(|(key1, _), (key2, _)| key1.cmp(key2))
        .map(|(_, model)| model);

    let models = release_track_active_models.collect_vec();
    let mut result = Vec::with_capacity(models.len());

    for model in models {
        let inserted = release_track::Entity::insert(model)
            .exec_with_returning(db)
            .await?;
        result.push(inserted);
    }

    Ok(result)
}

async fn create_songs_for_unlinked_tracks(
    unlinked: impl IntoIterator<Item = &Unlinked>,
    _release_id: i32,
    _author_id: i32, /* Not used in this implementation but kept for consistency */
    db: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let tracks: Vec<&Unlinked> = unlinked.into_iter().collect();
    let mut songs = Vec::with_capacity(tracks.len());

    for track in tracks {
        let song_model = song::ActiveModel::from(track);
        let inserted = song::Entity::insert(song_model)
            .exec_with_returning(db)
            .await?;
        songs.push(inserted);
    }

    Ok(songs)
}

pub async fn create_release_track_history(
    history_id: i32,
    tracks: &[NewTrack],
    author_id: i32,
    release_id: i32,
    db: &DatabaseTransaction,
) -> Result<Vec<release_track_history::Model>, DbErr> {
    if tracks.is_empty() {
        return Ok(vec![]);
    }

    // Partition tracks into linked and unlinked
    let (linked, unlinked): (Vec<_>, Vec<_>) =
        tracks.iter().enumerate().partition_map(|(i, x)| match x {
            NewTrack::Linked(x) => Either::Left((i, x)),
            NewTrack::Unlinked(x) => Either::Right((i, x)),
        });

    // Create songs for unlinked tracks if needed
    let new_songs = create_songs_for_unlinked_tracks(
        unlinked.iter().map(|(_, track)| *track),
        release_id,
        author_id,
        db,
    )
    .await?;

    // Create artist relationships for the new songs
    for (song, (_, track)) in new_songs.iter().zip(unlinked.iter()) {
        for artist_id in &track.artists {
            let model = song_artist::ActiveModel {
                song_id: Set(song.id),
                artist_id: Set(*artist_id),
            };
            song_artist::Entity::insert(model).exec(db).await?;
        }
    }

    // Create track history records
    let track_history_models = linked
        .into_iter()
        .map(|(i, x)| {
            (
                i,
                release_track_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    song_id: Set(x.song_id),
                    track_number: Set(x.track_number.clone()),
                    display_title: Set(x.display_title.clone()),
                    duration: Set(x.duration.map(|d| d.to_string())),
                },
            )
        })
        .chain(unlinked.into_iter().zip(new_songs.iter()).map(
            |((i, track), model)| {
                (
                    i,
                    release_track_history::ActiveModel {
                        id: NotSet,
                        history_id: Set(history_id),
                        song_id: Set(model.id),
                        track_number: Set(track.track_number.clone()),
                        display_title: Set(Some(model.title.clone())),
                        duration: Set(track.duration.map(|d| d.to_string())),
                    },
                )
            },
        ))
        .sorted_by(|(key1, _), (key2, _)| key1.cmp(key2))
        .map(|x| x.1);

    let models = track_history_models.collect_vec();
    let mut result = Vec::with_capacity(models.len());

    for model in models {
        let inserted = release_track_history::Entity::insert(model)
            .exec_with_returning(db)
            .await?;
        result.push(inserted);
    }

    Ok(result)
}

pub async fn update_release_track(
    release_id: i32,
    history_id: i32,
    author_id: i32,
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    // Delete existing tracks
    release_track::Entity::delete_many()
        .filter(release_track::Column::ReleaseId.eq(release_id))
        .exec(db)
        .await?;

    // Get tracks from history
    let tracks = release_track_history::Entity::find()
        .filter(release_track_history::Column::HistoryId.eq(history_id))
        .all(db)
        .await?;

    if tracks.is_empty() {
        return Ok(());
    }

    // Get track artists
    let track_artists = release_track_artist_history::Entity::find()
        .filter(
            release_track_artist_history::Column::TrackHistoryId
                .is_in(tracks.iter().map(|x| x.id)),
        )
        .all(db)
        .await?;

    // Create new tracks from history data
    let new_tracks: Vec<NewTrack> = tracks
        .into_iter()
        .map(|track| {
            let duration = track.duration.as_deref().and_then(|duration_str| {
                iso8601_duration::Duration::parse(duration_str)
                    .ok()
                    .map(|d| {
                        d.to_chrono_at_datetime(chrono::DateTime::<
                                chrono::Utc,
                            >::from_naive_utc_and_offset(
                                chrono::Utc::now().naive_utc(),
                                chrono::Utc,
                            ))
                    })
            });

            NewTrack::Linked(Linked {
                song_id: track.song_id,
                display_title: track.display_title,
                artists: track_artists
                    .iter()
                    .filter(|artist| artist.track_history_id == track.id)
                    .map(|artist| artist.artist_id)
                    .collect(),
                track_number: track.track_number,
                duration,
            })
        })
        .collect();

    // Create new tracks
    create_release_track(release_id, &new_tracks, author_id, db).await?;

    Ok(())
}
