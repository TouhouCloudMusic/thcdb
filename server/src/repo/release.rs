use chrono::{DateTime, Utc};
use entity::prelude::{
    Artist, CreditRole, Label, ReleaseArtist, ReleaseCredit, ReleaseLabel,
    ReleaseLocalizedTitle, ReleaseTrack,
};
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, EntityType,
};
use entity::{
    correction, correction_revision, correction_user, language, release,
    release_artist, release_artist_history, release_credit,
    release_credit_history, release_history, release_label,
    release_label_history, release_localized_title,
    release_localized_title_history, release_track,
    release_track_artist_history, release_track_history, song, song_artist,
};
use error_set::error_set;
use itertools::{Either, Itertools, izip};
use repo::correction::user::utils::add_co_author_if_updater_not_author;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityName, EntityOrSelect, EntityTrait, IntoActiveModel, IntoActiveValue,
    LoaderTrait, ModelTrait, QueryFilter, QueryOrder, QuerySelect,
};
use utils::check_existence;

use crate::dto::correction::Metadata;
use crate::dto::release::input::NewCredit;
use crate::dto::release::{
    GeneralRelease, Linked, NewTrack, ReleaseCorrection, ReleaseResponse,
    Unlinked,
};
use crate::dto::share::{LocalizedTitle, NewLocalizedTitle};
use crate::dto::song::NewSong;
use crate::error::RepositoryError;
use crate::{dto, repo};

error_set! {
    #[disable(From)]
    Error = {
        General(RepositoryError),
    };
}

impl<T> From<T> for Error
where
    T: Into<RepositoryError>,
{
    fn from(value: T) -> Self {
        Self::General(value.into())
    }
}

pub async fn find_by_id(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<ReleaseResponse, RepositoryError> {
    find_many(release::Column::Id.eq(id), db)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| RepositoryError::EntityNotFound {
            entity_name: release::Entity.table_name(),
        })
}

pub async fn find_by_keyword(
    kw: String,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseResponse>, RepositoryError> {
    find_many(release::Column::Title.like(kw), db).await
}

async fn find_many(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<ReleaseResponse>, RepositoryError> {
    let releases = release::Entity::find().filter(cond).all(db).await?;

    let artists = releases
        .load_many_to_many(Artist, ReleaseArtist, db)
        .await?;

    let labels = releases.load_many_to_many(Label, ReleaseLabel, db).await?;

    let llts = releases.load_many(ReleaseLocalizedTitle, db).await?;

    let langs = language::Entity::find()
        .filter(
            language::Column::Id.is_in(
                llts.iter()
                    .flatten()
                    .map(|x| x.language_id)
                    .unique()
                    .collect_vec(),
            ),
        )
        .all(db)
        .await?;

    let tracks = releases.load_many(ReleaseTrack, db).await?;

    // let flattened_tracks = tracks.iter().flatten();

    // let related_songs = flattened_tracks
    //     .cloned()
    //     .collect_vec()
    //     .load_many(Song, db)
    //     .await?
    //     .into_iter()
    //     .flatten()
    //     .collect_vec();

    let release_artist_ids =
        artists.iter().flatten().unique_by(|a| a.id).map(|x| x.id);

    let credits = releases.load_many(ReleaseCredit, db).await?;

    let flatten_credits = credits.clone().into_iter().flatten().collect_vec();

    let all_artists = flatten_credits
        .clone()
        .into_iter()
        .unique_by(|c| c.artist_id)
        .filter(|c| release_artist_ids.clone().any(|x| x == c.artist_id))
        .collect_vec()
        .load_one(Artist, db)
        .await?
        .into_iter()
        .flatten()
        .chain(artists.clone().into_iter().flatten())
        .collect_vec();

    let all_roles = flatten_credits
        .load_one(CreditRole, db)
        .await?
        .into_iter()
        .flatten()
        .collect_vec();

    let res = izip!(releases, artists, credits, labels, llts, tracks)
        .map(
            |(model, artists, credits, labels, localized_titles, tracks)| {
                ReleaseResponse {
                    id: model.id,
                    release_type: model.release_type,
                    release_date: model.release_date,
                    release_date_precision: Some(model.release_date_precision),
                    recording_date_start: model.recording_date_start,
                    recording_date_start_precision: Some(
                        model.recording_date_start_precision,
                    ),
                    recording_date_end: model.recording_date_end,
                    recording_date_end_precision: Some(
                        model.recording_date_end_precision,
                    ),
                    artists: artists.into_iter().map_into().collect(),
                    credits: credits
                        .into_iter()
                        .map(|c| dto::release::ReleaseCredit {
                            artist: all_artists
                                .iter()
                                .find(|a| a.id == c.artist_id)
                                .unwrap()
                                .into(),
                            role: all_roles
                                .iter()
                                .find(|r| r.id == c.role_id)
                                .unwrap()
                                .into(),
                            on: c.on,
                        })
                        .collect(),
                    labels: labels.into_iter().map_into().collect(),
                    localized_titles: localized_titles
                        .into_iter()
                        .map(|x| LocalizedTitle {
                            language: langs
                                .iter()
                                .find(|l| l.id == x.language_id)
                                .unwrap()
                                .into(),
                            title: x.title,
                        })
                        .collect(),
                    tracks: tracks.into_iter().map(|x| x.id).collect(),
                }
            },
        )
        .collect();

    Ok(res)
}

pub async fn create(
    data: GeneralRelease,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<release::Model, RepositoryError> {
    let new_release = release::ActiveModel::from(&data).insert(tx).await?;

    create_release_artist(new_release.id, &data.artists, tx).await?;
    create_release_credit(new_release.id, &data.credits, tx).await?;
    create_release_label(new_release.id, &data.labels, tx).await?;
    create_release_localized_title(new_release.id, &data.localized_titles, tx)
        .await?;

    let new_release_tracks = create_release_track(
        new_release.id,
        &data.tracks,
        correction_metadata.author_id,
        tx,
    )
    .await?;

    let correction = repo::correction::create_self_approval()
        .author_id(correction_metadata.author_id)
        .entity_type(EntityType::Release)
        .entity_id(new_release.id)
        .db(tx)
        .call()
        .await?;

    let mut data2 = data.clone();
    data2.tracks = new_release_tracks
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
        .data(&data2)
        .release_id(new_release.id)
        .author_id(correction_metadata.author_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    Ok(new_release)
}

pub async fn create_update_correction(
    release_id: i32,
    data: ReleaseCorrection,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    check_existence(release_id, tx).await?;

    let correction = repo::correction::create()
        .author_id(author_id)
        .entity_id(release_id)
        .entity_type(EntityType::Release)
        .status(CorrectionStatus::Pending)
        .r#type(CorrectionType::Update)
        .db(tx)
        .call()
        .await?;

    let history = save_release_history_and_link_relations()
        .data(&data.data)
        .release_id(release_id)
        .author_id(author_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(data.correction_desc.clone())
        .db(tx)
        .call()
        .await?;

    Ok(())
}

pub async fn update_update_correction(
    correction: correction::Model,
    data: ReleaseCorrection,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), Error> {
    add_co_author_if_updater_not_author(correction.id, author_id, tx).await?;

    let history = save_release_history_and_link_relations()
        .data(&data.data)
        .release_id(correction.entity_id)
        .author_id(author_id)
        .tx(tx)
        .call()
        .await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(data.correction_desc.clone())
        .db(tx)
        .call()
        .await?;

    Ok(())
}

pub(super) async fn apply_correction(
    correction: correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), RepositoryError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: correction_revision::Entity.table_name(),
        })?;

    let history =
        release_history::Entity::find_by_id(revision.entity_history_id)
            .one(tx)
            .await?
            .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
                entity_name: release_history::Entity.table_name(),
            })?;

    let mut active_model = release::ActiveModel::from(&history);
    active_model.id = Set(correction.entity_id);
    active_model.update(tx).await?;

    update_release_artist(correction.entity_id, history.id, tx).await?;

    update_release_credit(correction.entity_id, history.id, tx).await?;

    update_release_label(correction.entity_id, history.id, tx).await?;

    update_release_localized_title(correction.entity_id, history.id, tx)
        .await?;

    let author = repo::correction::user::find_author(correction.id, tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: correction_user::Entity.table_name(),
        })?;

    update_release_track(correction.entity_id, history.id, author.user_id, tx)
        .await?;

    Ok(())
}

#[bon::builder]
async fn save_release_history_and_link_relations(
    data: &GeneralRelease,
    release_id: i32,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<release_history::Model, DbErr> {
    let history = release_history::ActiveModel::from(data).insert(tx).await?;
    create_release_artist_history(history.id, &data.artists, tx).await?;
    create_release_credit_history(history.id, &data.credits, tx).await?;
    create_release_label_history(history.id, &data.labels, tx).await?;
    create_release_localized_title_history(
        history.id,
        &data.localized_titles,
        tx,
    )
    .await?;
    create_release_track_history()
        .history_id(history.id)
        .release_id(release_id)
        .tracks(&data.tracks)
        .author_id(author_id)
        .db(tx)
        .call()
        .await?;

    Ok(history)
}

async fn create_release_artist(
    release_id: i32,
    artists: &[i32],
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let release_artist =
        artists.iter().map(|artist_id| release_artist::ActiveModel {
            release_id: Set(release_id),
            artist_id: Set(*artist_id),
        });

    release_artist::Entity::insert_many(release_artist)
        .exec(transaction)
        .await?;

    Ok(())
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
    let release_artist_history =
        artists
            .iter()
            .map(|artist_id| release_artist_history::ActiveModel {
                history_id: Set(history_id),
                artist_id: Set(*artist_id),
            });

    release_artist_history::Entity::insert_many(release_artist_history)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_release_localized_title(
    release_id: i32,
    localized_titles: &[NewLocalizedTitle],
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles.iter().map(|item| {
        release_localized_title::Model {
            release_id,
            ..item.into()
        }
        .into_active_model()
    });

    release_localized_title::Entity::insert_many(models)
        .exec(transaction)
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
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if localized_titles.is_empty() {
        return Ok(());
    }

    let history_models = localized_titles.iter().map(|item| {
        release_localized_title_history::Model {
            history_id,
            ..item.into()
        }
        .into_active_model()
    });

    release_localized_title_history::Entity::insert_many(history_models)
        .exec(transaction)
        .await?;

    Ok(())
}

async fn create_release_label(
    release_id: i32,
    labels: &[i32],
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = labels.iter().map(|id| {
        release_label::Model {
            release_id,
            label_id: *id,
        }
        .into_active_model()
    });

    release_label::Entity::insert_many(models)
        .exec(transaction)
        .await?;

    Ok(())
}

async fn update_release_label(
    release_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_label::Entity::delete_many()
        .filter(release_label::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    let labels = release_label_history::Entity
        .select()
        .column(release_label_history::Column::LabelId)
        .filter(release_label_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?
        .into_iter()
        .map(|x| x.label_id)
        .collect_vec();

    create_release_label(release_id, &labels, tx).await?;

    Ok(())
}

async fn create_release_label_history(
    history_id: i32,
    labels: &[i32],
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let history_models = labels.iter().map(|id| {
        release_label_history::Model {
            history_id,
            label_id: *id,
        }
        .into_active_model()
    });

    release_label_history::Entity::insert_many(history_models)
        .exec(transaction)
        .await?;

    Ok(())
}

fn get_generated_desc(release_id: i32) -> String {
    format!("Automatically created during creation of release {release_id}")
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
                metadata: Metadata {
                    author_id,
                    description: generated_desc.clone(),
                },
            })
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;

    let song_artist_active_models = new_songs
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
        });

    song_artist::Entity::insert_many(song_artist_active_models)
        .exec(tx)
        .await?;

    let release_track_active_models = linked
        .into_iter()
        .map(|(i, x)| {
            (i, release_track::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                song_id: Set(x.song_id),
                track_number: Set(x.track_number.clone()),
                display_title: Set(x.display_title.clone()),
                duration: Set(x.duration.map(|d| d.to_string())),
            })
        })
        .chain(unlinked.into_iter().zip(new_songs.iter()).map(
            |((i, track), model)| {
                (i, release_track::ActiveModel {
                    id: NotSet,
                    release_id: Set(release_id),
                    song_id: Set(model.id),
                    track_number: Set(track.track_number.clone()),
                    display_title: Set(Some(model.title.clone())),
                    duration: Set(track.duration.map(|d| d.to_string())),
                })
            },
        ))
        .sorted_by(|(key1, _), (key2, _)| key1.cmp(key2))
        .map(|x| x.1);

    release_track::Entity::insert_many(release_track_active_models)
        .exec_with_returning_many(tx)
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

    let new_songs = create_new_songs_from_tracks(
        unlinked.as_slice(),
        release_id,
        author_id,
        db,
    )
    .await?;

    let release_track_active_models = linked
        .into_iter()
        .map(|(i, x)| {
            (i, release_track_history::ActiveModel {
                id: NotSet,
                history_id: Set(history_id),
                song_id: Set(x.song_id),
                track_number: Set(x.track_number.clone()),
                display_title: Set(x.display_title.clone()),
                duration: Set(x.duration.map(|d| d.to_string())),
            })
        })
        .chain(unlinked.into_iter().zip(new_songs.iter()).map(
            |((i, track), model)| {
                (i, release_track_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(history_id),
                    song_id: Set(model.id),
                    track_number: Set(track.track_number.clone()),
                    display_title: Set(Some(model.title.clone())),
                    duration: Set(track.duration.map(|d| d.to_string())),
                })
            },
        ))
        .sorted_by(|(key1, _), (key2, _)| key1.cmp(key2))
        .map(|x| x.1);

    release_track_history::Entity::insert_many(release_track_active_models)
        .exec_with_returning_many(db)
        .await
}

async fn create_new_songs_from_tracks(
    unlinked: &[(usize, &Unlinked)],
    release_id: i32,
    author_id: i32,
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let generated_desc = get_generated_desc(release_id);

    repo::song::create_many(
        unlinked
            .iter()
            .map(|(_, x)| NewSong {
                title: x.display_title.clone(),
                languages: None,
                localized_titles: None,
                credits: None,
                metadata: Metadata {
                    author_id,
                    description: generated_desc.clone(),
                },
            })
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await
}

async fn create_release_credit(
    release_id: i32,
    credits: &[NewCredit],
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let credit_model =
        credits.iter().map(|credit| release_credit::ActiveModel {
            id: NotSet,
            artist_id: credit.artist_id.into_active_value(),
            release_id: release_id.into_active_value(),
            role_id: credit.role_id.into_active_value(),
            on: Set(credit.on.clone()),
        });

    release_credit::Entity::insert_many(credit_model)
        .exec(transaction)
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
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let credit_history_model =
        credits
            .iter()
            .map(|credit| release_credit_history::ActiveModel {
                id: NotSet,
                artist_id: credit.artist_id.into_active_value(),
                history_id: history_id.into_active_value(),
                role_id: credit.role_id.into_active_value(),
                on: Set(credit.on.clone()),
            });

    release_credit_history::Entity::insert_many(credit_history_model)
        .exec(transaction)
        .await?;

    Ok(())
}

mod utils {
    use sea_orm::PaginatorTrait;

    use super::*;

    pub async fn check_existence(
        id: i32,
        db: &impl ConnectionTrait,
    ) -> Result<(), RepositoryError> {
        let count = release::Entity::find_by_id(id).count(db).await?;

        if count > 0 {
            Ok(())
        } else {
            Err(RepositoryError::EntityNotFound {
                entity_name: release::Entity.table_name(),
            })
        }
    }
}
