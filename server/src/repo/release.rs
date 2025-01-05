use chrono::Utc;
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, EntityType,
};
use entity::{
    correction, release, release_artist, release_artist_history,
    release_credit, release_credit_history, release_history, release_label,
    release_label_history, release_localized_title,
    release_localized_title_history, song, song_artist, song_artist_history,
    song_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveModel, IntoActiveValue, QueryFilter,
};

use crate::dto::correction::Metadata;
use crate::dto::release::input::{Credit, LocalizedTitle};
use crate::dto::release::{GeneralRelease, NewTrack};
use crate::error::GeneralRepositoryError;
use crate::repo;

pub async fn create(
    data: GeneralRelease,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<release::Model, GeneralRepositoryError> {
    let new_release = save_and_link_release_data(&data, tx).await?;

    let correction = repo::correction::create_self_approval()
        .author_id(correction_metadata.author_id)
        .entity_type(EntityType::Release)
        .entity_id(new_release.id)
        .db(tx)
        .call()
        .await?;

    let history = save_and_link_release_history(&data, tx).await?;

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
    data: GeneralRelease,
    correction_metadata: Metadata,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let now = Utc::now();

    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Pending),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::Release),
        entity_id: Set(release_id),

        created_at: Set(now.into()),
        handled_at: NotSet,
    }
    .insert(tx)
    .await?;

    let history = save_and_link_release_history(&data, tx).await?;

    repo::correction::link_history()
        .correction_id(correction.id)
        .entity_history_id(history.id)
        .description(correction_metadata.description.clone())
        .db(tx)
        .call()
        .await?;

    repo::correction::create()
        .author_id(correction_metadata.author_id)
        .entity_id(release_id)
        .entity_type(EntityType::Release)
        .status(CorrectionStatus::Pending)
        .r#type(CorrectionType::Update)
        .db(tx)
        .call()
        .await?;

    Ok(())
}

async fn create_release_artist<'f>(
    release_id: i32,
    artists: &'f [i32],
    transaction: &'f DatabaseTransaction,
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
    artists: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    release_artist::Entity::delete_many()
        .filter(release_artist::Column::ReleaseId.eq(release_id))
        .exec(tx)
        .await?;

    create_release_artist(release_id, artists, tx).await?;

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
    localized_titles: &[LocalizedTitle],
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

async fn create_release_localized_title_history(
    history_id: i32,
    localized_titles: &[LocalizedTitle],
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

async fn create_release_track(
    release_id: i32,
    tracks: &[NewTrack],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if tracks.is_empty() {
        return Ok(());
    }

    let active_models = tracks.iter().map(|x| {
        let mut model: song::ActiveModel =
            IntoActiveModel::into_active_model(x.clone());

        model.release_id = Set(release_id);

        model
    });

    let new_song_historys = song::Entity::insert_many(active_models)
        .exec_with_returning_many(tx)
        .await?;

    let song_artist_active_models = new_song_historys
        .iter()
        .zip(tracks.iter())
        .flat_map(|(song, track)| {
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

    Ok(())
}

async fn create_release_track_history(
    history_id: i32,
    tracks: &[NewTrack],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if tracks.is_empty() {
        return Ok(());
    }

    let active_models = tracks.iter().map(|x| {
        let mut model: song_history::ActiveModel =
            IntoActiveModel::into_active_model(x.clone());

        model.release_history_id = Set(history_id);

        model
    });

    let new_song_historys = song_history::Entity::insert_many(active_models)
        .exec_with_returning_many(tx)
        .await?;

    let song_history_artist_active_models = new_song_historys
        .iter()
        .zip(tracks.iter())
        .flat_map(|(song, track)| {
            track.artists.iter().map(|artist_id| {
                song_artist_history::ActiveModel {
                    history_id: song.id.into_active_value(),
                    artist_id: artist_id.into_active_value(),
                }
            })
        });

    song_artist_history::Entity::insert_many(song_history_artist_active_models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_release_credit(
    release_id: i32,
    credits: &[Credit],
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

async fn create_release_credit_history(
    release_history_id: i32,
    credits: &[Credit],
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
                release_history_id: release_history_id.into_active_value(),
                role_id: credit.role_id.into_active_value(),
                on: Set(credit.on.clone()),
            });

    release_credit_history::Entity::insert_many(credit_history_model)
        .exec(transaction)
        .await?;

    Ok(())
}

async fn save_and_link_release_data(
    data: &GeneralRelease,
    db: &DatabaseTransaction,
) -> Result<release::Model, DbErr> {
    let release = release::ActiveModel::from(data).insert(db).await?;

    create_release_artist(release.id, &data.artists, db).await?;
    create_release_credit(release.id, &data.credits, db).await?;
    create_release_label(release.id, &data.labels, db).await?;
    create_release_localized_title(release.id, &data.localized_titles, db)
        .await?;
    create_release_track(release.id, &data.tracks, db).await?;

    Ok(release)
}

async fn save_and_link_release_history(
    data: &GeneralRelease,
    db: &DatabaseTransaction,
) -> Result<release_history::Model, DbErr> {
    let history = release_history::ActiveModel::from(data).insert(db).await?;

    create_release_artist_history(history.id, &data.artists, db).await?;
    create_release_credit_history(history.id, &data.credits, db).await?;
    create_release_label_history(history.id, &data.labels, db).await?;
    create_release_localized_title_history(
        history.id,
        &data.localized_titles,
        db,
    )
    .await?;
    create_release_track_history(history.id, &data.tracks, db).await?;

    Ok(history)
}
