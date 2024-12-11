use bon::builder;
use entity::sea_orm_active_enums::{
    ChangeRequestStatus, ChangeRequestType, ChangeRequestUserType,
    DatePrecision, EntityType, ReleaseType,
};
use entity::{
    change_request, change_request_revision, change_request_user, release,
    release_artist, release_artist_history, release_credit,
    release_credit_history, release_history, release_label,
    release_label_history, release_localized_title,
    release_localized_title_history, release_track, release_track_artist,
    release_track_artist_history, release_track_history, song,
};
use itertools::{Either, Itertools};
use sea_orm::prelude::Date;
use sea_orm::ActiveValue::*;
use sea_orm::{
    ActiveModelTrait, ActiveValue, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveModel, IntoActiveValue, TransactionTrait,
};

use crate::dto::release::input::{Credit, LinkedTrack, LocalizedTitle, Track};

pub struct CreateReleaseDto {
    pub title: String,
    pub release_type: ReleaseType,
    pub release_date: Option<Date>,
    pub release_date_precision: Option<DatePrecision>,
    pub recording_date_start: Option<Date>,
    pub recording_date_start_precision: Option<DatePrecision>,
    pub recording_date_end: Option<Date>,
    pub recording_date_end_precision: Option<DatePrecision>,
    pub artists: Vec<i32>,
    pub localized_titles: Vec<LocalizedTitle>,
    pub labels: Vec<i32>,
    pub tracks: Vec<Track>,
    pub credits: Vec<Credit>,
    pub author_id: i32,
    pub description: String,
}

pub async fn create(
    CreateReleaseDto {
        title,
        release_type,
        release_date,
        release_date_precision,
        recording_date_start,
        recording_date_start_precision,
        recording_date_end,
        recording_date_end_precision,
        artists,
        localized_titles,
        labels,
        tracks,
        credits,
        author_id,
        description,
    }: CreateReleaseDto,
    db: &DatabaseTransaction,
) -> Result<release::Model, DbErr> {
    let transaction = db.begin().await?;
    let tx = &transaction;

    let new_release = release::ActiveModel {
        id: ActiveValue::NotSet,
        title: ActiveValue::Set(title),
        release_type: ActiveValue::Set(release_type),
        release_date: ActiveValue::Set(release_date),
        release_date_precision: release_date_precision.into_active_value(),
        recording_date_start: ActiveValue::Set(recording_date_start),
        recording_date_start_precision: recording_date_start_precision
            .into_active_value(),
        recording_date_end: ActiveValue::Set(recording_date_end),
        recording_date_end_precision: recording_date_end_precision
            .into_active_value(),
        created_at: ActiveValue::NotSet,
        updated_at: ActiveValue::NotSet,
    }
    .insert(tx)
    .await?;

    let entity_create_time = &new_release.created_at;

    let history = release_history::ActiveModel::from(new_release.clone())
        .insert(tx)
        .await?;

    let change_request = change_request::ActiveModel {
        id: ActiveValue::NotSet,
        request_status: ActiveValue::Set(ChangeRequestStatus::Approved),
        request_type: ActiveValue::Set(ChangeRequestType::Create),
        entity_type: ActiveValue::Set(EntityType::Release),
        description: ActiveValue::Set(description),
        created_at: entity_create_time.into_active_value(),
        handled_at: entity_create_time.into_active_value(),
    }
    .insert(tx)
    .await?;

    change_request_revision::Model {
        change_request_id: change_request.id,
        entity_history_id: history.id,
    }
    .into_active_model()
    .insert(tx)
    .await?;

    let change_request_users = vec![
        ChangeRequestUserType::Author,
        ChangeRequestUserType::Approver,
    ]
    .into_iter()
    .map(|t| change_request_user::ActiveModel {
        id: ActiveValue::NotSet,
        change_request_id: change_request.id.into_active_value(),
        user_id: author_id.into_active_value(),
        user_type: t.into_active_value(),
    });

    change_request_user::Entity::insert_many(change_request_users)
        .exec(tx)
        .await?;

    create_release_artist()
        .release_id(new_release.id)
        .history_id(history.id)
        .artists(artists)
        .transaction(tx)
        .call()
        .await?;

    if !localized_titles.is_empty() {
        create_release_localized_title()
            .release_id(new_release.id)
            .history_id(history.id)
            .localized_titles(localized_titles)
            .transaction(tx)
            .call()
            .await?;
    }

    if !labels.is_empty() {
        create_release_label()
            .release_id(new_release.id)
            .history_id(history.id)
            .labels(labels)
            .transaction(tx)
            .call()
            .await?;
    }

    if !tracks.is_empty() {
        create_release_track()
            .release_id(new_release.id)
            .history_id(history.id)
            .tracks(tracks)
            .transaction(tx)
            .call()
            .await?
    }

    if !credits.is_empty() {
        create_release_credit()
            .release_id(new_release.id)
            .release_history_id(history.id)
            .credits(credits)
            .transaction(tx)
            .call()
            .await?
    }

    transaction.commit().await?;

    Ok(new_release)
}

#[builder]
async fn create_release_artist(
    release_id: i32,
    history_id: i32,
    artists: Vec<i32>,
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let release_artist = artists.iter().map(|id| {
        release_artist::Model {
            release_id,
            artist_id: *id,
        }
        .into_active_model()
    });

    let release_artist_history = artists.iter().map(|id| {
        release_artist_history::Model {
            history_id,
            artist_id: *id,
        }
        .into_active_model()
    });

    release_artist::Entity::insert_many(release_artist)
        .exec(transaction)
        .await?;

    release_artist_history::Entity::insert_many(release_artist_history)
        .exec(transaction)
        .await?;

    Ok(())
}

#[builder]
async fn create_release_localized_title(
    release_id: i32,
    history_id: i32,
    localized_titles: Vec<LocalizedTitle>,
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = localized_titles.iter().map(|item| {
        release_localized_title::Model {
            release_id,
            ..item.into()
        }
        .into_active_model()
    });

    let history_models = localized_titles.iter().map(|item| {
        release_localized_title_history::Model {
            history_id,
            ..item.into()
        }
        .into_active_model()
    });

    release_localized_title::Entity::insert_many(models)
        .exec(transaction)
        .await?;
    release_localized_title_history::Entity::insert_many(history_models)
        .exec(transaction)
        .await?;

    Ok(())
}

#[builder]
async fn create_release_label(
    release_id: i32,
    history_id: i32,
    labels: Vec<i32>,
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = labels.iter().map(|id| {
        release_label::Model {
            release_id,
            label_id: *id,
        }
        .into_active_model()
    });

    let history_models = labels.iter().map(|id| {
        release_label_history::Model {
            history_id,
            label_id: *id,
        }
        .into_active_model()
    });

    release_label::Entity::insert_many(models)
        .exec(transaction)
        .await?;

    release_label_history::Entity::insert_many(history_models)
        .exec(transaction)
        .await?;

    Ok(())
}

#[builder]
async fn create_release_track(
    release_id: i32,
    history_id: i32,
    tracks: Vec<Track>,
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let tx = transaction;
    let (linked, unlinked): (Vec<_>, Vec<_>) =
        tracks.into_iter().partition_map(|track| match track {
            Track::Linked(t) => Either::Left(t),
            Track::Unlinked(t) => Either::Right(t),
        });

    let song_active_models =
        unlinked.iter().map(IntoActiveModel::into_active_model);

    if song_active_models.len() != unlinked.len() {
        return Err(DbErr::Custom(
            "New song length dosen't match unlinked tracks".to_string(),
        ));
    }

    let new_songs = song::Entity::insert_many(song_active_models)
        .exec_with_returning_many(tx)
        .await?
        .into_iter()
        .zip(unlinked.into_iter())
        .map(LinkedTrack::from);

    let tracks = new_songs
        .into_iter()
        .chain(linked.into_iter())
        // TODO: Do we need sorted here?
        .sorted_by(|a, b| a.track_order.cmp(&b.track_order))
        .collect_vec();

    let (track_models, track_history_models): (Vec<_>, Vec<_>) = tracks
        .iter()
        .map(|track| {
            let track_model = release_track::ActiveModel {
                id: ActiveValue::NotSet,
                release_id: release_id.into_active_value(),
                song_id: track.song_id.into_active_value(),
                track_order: track.track_order.into_active_value(),
                track_number: Into::<Option<String>>::into(
                    track.track_number.clone(),
                )
                .into_active_value(),
                title: track.title.clone().into_active_value(),
            };

            let track_history_model = release_track_history::ActiveModel {
                id: NotSet,
                release_history_id: history_id.into_active_value(),
                song_id: track.song_id.into_active_value(),
                track_order: track.track_order.into_active_value(),
                track_number: Into::<Option<String>>::into(
                    track.track_number.clone(),
                )
                .into_active_value(),
                title: track.title.clone().into_active_value(),
            };

            (track_model, track_history_model)
        })
        .unzip();

    let new_release_tracks = release_track::Entity::insert_many(track_models)
        .exec_with_returning_many(tx)
        .await?
        .into_iter()
        .zip(tracks.iter());

    let new_release_track_historys =
        release_track_history::Entity::insert_many(track_history_models)
            .exec_with_returning_many(tx)
            .await?
            .into_iter()
            .zip(tracks.iter());

    let track_artist_models =
        new_release_tracks.into_iter().flat_map(|(model, track)| {
            track.artist.iter().map(move |artist_id| {
                release_track_artist::Model {
                    track_id: model.id,
                    artist_id: *artist_id,
                }
                .into_active_model()
            })
        });

    let track_artist_history_model = new_release_track_historys
        .into_iter()
        .flat_map(|(model, track)| {
            track.artist.iter().map(move |artist_id| {
                release_track_artist_history::Model {
                    track_history_id: model.id,
                    artist_id: *artist_id,
                }
                .into_active_model()
            })
        });

    release_track_artist::Entity::insert_many(track_artist_models)
        .exec(tx)
        .await?;
    release_track_artist_history::Entity::insert_many(
        track_artist_history_model,
    )
    .exec(tx)
    .await?;

    Ok(())
}

#[builder]
async fn create_release_credit(
    release_id: i32,
    release_history_id: i32,
    credits: Vec<Credit>,
    transaction: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let credit_model =
        credits.iter().map(|credit| release_credit::ActiveModel {
            id: NotSet,
            artist_id: credit.artist_id.into_active_value(),
            release_id: release_id.into_active_value(),
            role_id: credit.role_id.into_active_value(),
            on: Set(credit.on.clone()),
        });

    let credit_history_model =
        credits
            .iter()
            .map(|credit| release_credit_history::ActiveModel {
                id: NotSet,
                artist_id: credit.artist_id.into_active_value(),
                release_history_id: release_history_id.into_active_value(),
                role_id: credit.role_id.into_active_value(),
                on: Set(credit.on.clone()),
            });

    release_credit::Entity::insert_many(credit_model)
        .exec(transaction)
        .await?;
    release_credit_history::Entity::insert_many(credit_history_model)
        .exec(transaction)
        .await?;

    Ok(())
}
