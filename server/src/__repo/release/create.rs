use chrono::{DateTime, Utc};
use entity::sea_orm_active_enums::EntityType;
use entity::{
    correction, correction_revision, correction_user, release, release_artist,
    release_artist_history, release_catalog_number,
    release_catalog_number_history, release_credit, release_credit_history,
    release_event, release_event_history, release_history,
    release_localized_title, release_localized_title_history, release_track,
    release_track_artist_history, release_track_history, song, song_artist,
};
use itertools::{Either, Itertools};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityName,
    EntityOrSelect, EntityTrait, IntoActiveModel, IntoActiveValue, ModelTrait,
    QueryFilter, QueryOrder, QuerySelect,
};
use tokio::try_join;

use super::share::check_existence;
use crate::dto::correction::Metadata;
use crate::dto::release::input::NewCredit;
use crate::dto::release::{
    Linked, NewTrack, ReleaseCatalogNumber, ReleaseCorrection, Unlinked,
};
use crate::dto::share::NewLocalizedTitle;
use crate::dto::song::NewSong;
use crate::error::ServiceError;

use crate::utils::MapInto;
use crate::utils::orm::InsertMany;

pub async fn create(
    data: ReleaseCorrection,
    user_id: i32,
    tx: &DatabaseTransaction,
) -> Result<release::Model, ServiceError> {
    let mut new_release_tracks = None;

    let release =
        save_and_link_relations(user_id, &data, &mut new_release_tracks, tx)
            .await?;

    let mut data = data;

    data.tracks = new_release_tracks
        .unwrap()
        .into_iter()
        .zip(data.tracks)
        .map(|(model, track)| {
            let res = match track {
                NewTrack::Linked(v) => v,
                NewTrack::Unlinked(unlinked) => Linked {
                    artists: unlinked.artists,
                    track_number: unlinked.track_number,
                    duration: unlinked.duration,
                    song_id: model.song_id,
                    // TODO: figure out if display title needs here
                    display_title: None,
                },
            };
            NewTrack::Linked(res)
        })
        .collect();

    let history = save_release_history_and_link_relations()
        .data(&data)
        .release_id(release.id)
        .author_id(user_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::create_self_approval()
        .author_id(user_id)
        .entity_type(EntityType::Tag)
        .entity_id(release.id)
        .history_id(history.id)
        .description(data.correction_metadata.description)
        .call(tx)
        .await?;

    Ok(release)
}

pub async fn create_correction(
    release_id: i32,
    data: ReleaseCorrection,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), ServiceError> {
    check_existence(release_id, tx).await?;

    let history = save_release_history_and_link_relations()
        .data(&data)
        .release_id(release_id)
        .author_id(author_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::create()
        .author_id(author_id)
        .entity_id(release_id)
        .entity_type(EntityType::Release)
        .history_id(history.id)
        .description(data.correction_metadata.description)
        .call(tx)
        .await?;

    Ok(())
}

pub async fn update_correction(
    correction: correction::Model,
    data: ReleaseCorrection,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), ServiceError> {
    let history = save_release_history_and_link_relations()
        .data(&data)
        .release_id(correction.entity_id)
        .author_id(author_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::update()
        .author_id(author_id)
        .history_id(history.id)
        .correction_id(correction.id)
        .description(data.correction_metadata.description)
        .call(tx)
        .await?;

    Ok(())
}

pub async fn apply_correction(
    correction: correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), ServiceError> {
    // TODO: refactor
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history =
        release_history::Entity::find_by_id(revision.entity_history_id)
            .one(tx)
            .await?
            .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
                entity_name: release_history::Entity.table_name(),
            })?;

    let author = repo::correction::user::find_author(correction.id, tx)
        .await?
        .ok_or_else(|| ServiceError::UnexpRelatedEntityNotFound {
            entity_name: correction_user::Entity.table_name(),
        })?;

    tokio::try_join!(
        release::ActiveModel::from((correction.entity_id, &history)).update(tx),
        update_release_artist(correction.entity_id, history.id, tx),
        update_release_catalog_number(correction.entity_id, history.id, tx),
        update_release_credit(correction.entity_id, history.id, tx),
        update_release_event(correction.entity_id, history.id, tx),
        update_release_localized_title(correction.entity_id, history.id, tx),
        update_release_track(
            correction.entity_id,
            history.id,
            author.user_id,
            tx
        ),
    )?;

    Ok(())
}

async fn save_and_link_relations(
    author_id: i32,
    data: &ReleaseCorrection,
    new_release_tracks: &mut Option<Vec<release_track::Model>>,
    tx: &DatabaseTransaction,
) -> Result<release::Model, DbErr> {
    let new_release: release::Model =
        release::ActiveModel::from(data).insert(tx).await?;

    try_join!(
        create_release_artist(new_release.id, &data.artists, tx),
        create_release_catalog_number(new_release.id, &data.catalog_nums, tx),
        create_release_credit(new_release.id, &data.credits, tx),
        create_release_event(new_release.id, &data.events, tx),
        create_release_localized_title(
            new_release.id,
            &data.localized_titles,
            tx
        ),
        async {
            create_release_track(new_release.id, &data.tracks, author_id, tx)
                .await
                .map(|x| {
                    *new_release_tracks = Some(x);
                })
        }
    )?;

    Ok(new_release)
}

#[bon::builder]
async fn save_release_history_and_link_relations(
    data: &ReleaseCorrection,
    release_id: i32,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<release_history::Model, DbErr> {
    let history = release_history::ActiveModel::from(data).insert(tx).await?;

    tokio::try_join!(
        create_release_artist_history(history.id, &data.artists, tx),
        create_release_catalog_number_history(
            history.id,
            &data.catalog_nums,
            tx,
        ),
        create_release_credit_history(history.id, &data.credits, tx),
        create_release_event_history(history.id, &data.events, tx),
        create_release_localized_title_history(
            history.id,
            &data.localized_titles,
            tx,
        ),
        create_release_track_history()
            .history_id(history.id)
            .release_id(release_id)
            .tracks(&data.tracks)
            .author_id(author_id)
            .db(tx)
            .call()
    )?;

    Ok(history)
}

async fn create_release_artist(
    release_id: i32,
    artists: &[i32],
    db: &DatabaseTransaction,
) -> Result<(), DbErr> {
    artists
        .iter()
        .map(|artist_id| release_artist::ActiveModel {
            release_id: Set(release_id),
            artist_id: Set(*artist_id),
        })
        .insert_many_without_returning(db)
        .await
}

async fn update_release_artist(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_artist::Entity::delete_many()
        .filter(release_artist::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let artists = release_artist_history::Entity
        .select()
        .filter(release_artist_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| x.artist_id)
        .collect_vec();

    create_release_artist(release_id, &artists, tx).await?;

    Ok(())
}

async fn create_release_artist_history(
    history_id: i32,
    artists: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    artists
        .iter()
        .map(|artist_id| release_artist_history::ActiveModel {
            history_id: Set(history_id),
            artist_id: Set(*artist_id),
        })
        .insert_many_without_returning(tx)
        .await
}

async fn create_release_catalog_number(
    release_id: i32,
    catalog_nums: &[ReleaseCatalogNumber],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    catalog_nums
        .iter()
        .map(|data| release_catalog_number::ActiveModel {
            id: NotSet,
            release_id: Set(release_id),
            label_id: Set(data.label_id),
            catalog_number: Set(data.catalog_number.clone()),
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

async fn update_release_catalog_number(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_catalog_number::Entity::delete_many()
        .filter(release_catalog_number::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let labels = release_catalog_number_history::Entity
        .select()
        .column(release_catalog_number_history::Column::LabelId)
        .filter(
            release_catalog_number_history::Column::HistoryId.eq(history_id),
        )
        .all(tx)
        .await?
        .map_into();

    create_release_catalog_number(release_id, &labels, tx).await?;

    Ok(())
}

async fn create_release_catalog_number_history(
    history_id: i32,
    catalog_nums: &[ReleaseCatalogNumber],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    catalog_nums
        .iter()
        .map(|data| release_catalog_number_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            catalog_number: Set(data.catalog_number.clone()),
            label_id: Set(data.label_id),
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

async fn create_release_credit(
    release_id: i32,
    credits: &[NewCredit],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    credits
        .iter()
        .map(|credit| release_credit::ActiveModel {
            id: NotSet,
            artist_id: credit.artist_id.into_active_value(),
            release_id: release_id.into_active_value(),
            role_id: credit.role_id.into_active_value(),
            on: Set(credit.on.clone()),
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

async fn update_release_credit(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_credit::Entity::delete_many()
        .filter(release_credit::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let credits = release_credit_history::Entity
        .select()
        .filter(release_credit_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| NewCredit {
            artist_id: x.artist_id,
            role_id: x.role_id,
            on: x.on,
        })
        .collect_vec();

    create_release_credit(release_id, &credits, tx).await?;

    Ok(())
}

async fn create_release_credit_history(
    history_id: i32,
    credits: &[NewCredit],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    credits
        .iter()
        .map(|credit| release_credit_history::ActiveModel {
            id: NotSet,
            artist_id: credit.artist_id.into_active_value(),
            history_id: history_id.into_active_value(),
            role_id: credit.role_id.into_active_value(),
            on: Set(credit.on.clone()),
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

async fn create_release_event(
    release_id: i32,
    events: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if !events.is_empty() {
        events
            .iter()
            .map(|id| release_event::ActiveModel {
                release_id: release_id.into_active_value(),
                event_id: id.into_active_value(),
            })
            .insert_many_without_returning(tx)
            .await?;
    }

    Ok(())
}

async fn update_release_event(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_event::Entity::delete_many()
        .filter(release_event::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let events = release_event_history::Entity::find()
        .filter(release_event_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| x.event_id)
        .collect_vec();

    create_release_event(release_id, &events, tx).await
}

async fn create_release_event_history(
    history_id: i32,
    events: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if !events.is_empty() {
        events
            .iter()
            .map(|id| release_event_history::ActiveModel {
                history_id: history_id.into_active_value(),
                event_id: id.into_active_value(),
            })
            .insert_many_without_returning(tx)
            .await?;
    }

    Ok(())
}

async fn create_release_localized_title(
    release_id: i32,
    localized_titles: &[NewLocalizedTitle],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }

    localized_titles
        .iter()
        .map(|item| {
            release_localized_title::Model {
                release_id,
                ..item.into()
            }
            .into_active_model()
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

async fn update_release_localized_title(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_localized_title::Entity::delete_many()
        .filter(release_localized_title::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let localized_titles = release_localized_title_history::Entity
        .select()
        .filter(
            release_localized_title_history::Column::HistoryId.eq(history_id),
        )
        .all(tx)
        .await?
        .into_iter()
        .map(|x| NewLocalizedTitle {
            language_id: x.language_id,
            title: x.title,
        })
        .collect_vec();

    create_release_localized_title(release_id, &localized_titles, tx).await?;

    Ok(())
}

async fn create_release_localized_title_history(
    history_id: i32,
    localized_titles: &[NewLocalizedTitle],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }
    localized_titles
        .iter()
        .map(|item| {
            release_localized_title_history::Model {
                history_id,
                ..item.into()
            }
            .into_active_model()
        })
        .insert_many_without_returning(tx)
        .await?;

    Ok(())
}

fn get_generated_desc(release_id: i32) -> String {
    format!("Automatically created when creating release {release_id}")
}

async fn create_release_track(
    release_id: i32,
    tracks: &[NewTrack],
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<Vec<release_track::Model>, DbErr> {
    if tracks.is_empty() {
        return Ok(vec![]);
    }

    let (linked, unlinked): (Vec<_>, Vec<_>) =
        tracks.iter().enumerate().partition_map(|(i, x)| match x {
            NewTrack::Linked(x) => Either::Left((i, x)),
            NewTrack::Unlinked(x) => Either::Right((i, x)),
        });

    let generated_desc = get_generated_desc(release_id);
    let new_songs = repo::song::create_many(
        unlinked
            .iter()
            .map(|(_, x)| NewSong {
                title: x.display_title.clone(),
                languages: None,
                localized_titles: None,
                credits: None,
                correction_metadata: Metadata {
                    description: generated_desc.clone(),
                },
            })
            .collect_vec()
            .as_slice(),
        author_id,
        tx,
    )
    .await?;

    new_songs
        .iter()
        .zip(unlinked.iter())
        .flat_map(|(song, (_, track))| {
            track
                .artists
                .iter()
                .map(|artist_id| song_artist::ActiveModel {
                    song_id: song.id.into_active_value(),
                    artist_id: artist_id.into_active_value(),
                })
        })
        .collect_vec()
        .insert_many_without_returning(tx)
        .await?;

    linked
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
        .map(|(_, model)| model)
        .insert_many(tx)
        .await
}

async fn update_release_track(
    release_id: i32,
    history_id: i32,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_track::Entity::delete_many()
        .filter(release_track::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let tracks = release_track_history::Entity
        .select()
        .filter(release_track_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .collect_vec();

    if tracks.is_empty() {
        return Ok(());
    }

    let track_artists = release_track_artist_history::Entity
        .select()
        .filter(
            release_track_artist_history::Column::TrackHistoryId
                .is_in(tracks.iter().map(|x| x.id)),
        )
        .all(tx)
        .await?;

    let tracks: Vec<_> = tracks
        .into_iter()
        .map(|x| {
            let duration = match x.duration {
                Some(ref v) => {
                    let parsed_duration = iso8601_duration::Duration::parse(v)
                        .map_err(|_| {
                            DbErr::Custom(format!(
                                "invalid interval value from database: {v}"
                            ))
                        })?;

                    Some(
                        parsed_duration
                            .to_chrono_at_datetime(DateTime::<Utc>::default()),
                    )
                }
                None => None,
            };

            Ok::<NewTrack, DbErr>(NewTrack::Linked(Linked {
                song_id: x.song_id,
                display_title: x.display_title,
                artists: track_artists
                    .iter()
                    .filter(|y| y.track_history_id == x.id)
                    .map(|y| y.artist_id)
                    .collect(),
                track_number: x.track_number,
                duration,
            }))
        })
        .try_collect()?;

    create_release_track(release_id, &tracks, author_id, tx).await?;

    Ok(())
}

#[bon::builder]
async fn create_release_track_history(
    history_id: i32,
    tracks: &[NewTrack],
    author_id: i32,
    release_id: i32,
    db: &DatabaseTransaction,
) -> Result<Vec<release_track_history::Model>, DbErr> {
    if tracks.is_empty() {
        return Ok(vec![]);
    }

    let (linked, unlinked): (Vec<_>, Vec<_>) =
        tracks.iter().enumerate().partition_map(|(i, x)| match x {
            NewTrack::Linked(x) => Either::Left((i, x)),
            NewTrack::Unlinked(x) => Either::Right((i, x)),
        });

    let new_songs = create_new_songs_from_unlinked_tracks(
        unlinked.iter().map(|(_, track)| *track),
        release_id,
        author_id,
        db,
    )
    .await?;

    let release_track_active_models = linked
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

    release_track_history::Entity::insert_many(release_track_active_models)
        .exec_with_returning_many(db)
        .await
}

async fn create_new_songs_from_unlinked_tracks(
    unlinked: impl IntoIterator<Item = &Unlinked>,
    release_id: i32,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let generated_desc = get_generated_desc(release_id);

    repo::song::create_many(
        &unlinked
            .into_iter()
            .map(|x| NewSong {
                title: x.display_title.clone(),
                languages: None,
                localized_titles: None,
                credits: None,
                correction_metadata: Metadata {
                    description: generated_desc.clone(),
                },
            })
            .collect_vec(),
        author_id,
        tx,
    )
    .await
}
