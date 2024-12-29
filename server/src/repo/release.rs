use bon::builder;
use chrono::Utc;
use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, CorrectionUserType, EntityType,
};
use entity::{
    correction, correction_user, release, release_artist,
    release_artist_history, release_credit, release_credit_history,
    release_history, release_label, release_label_history,
    release_localized_title, release_localized_title_history, song,
    song_artist, song_artist_history, song_history,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveModel, IntoActiveValue, QueryFilter,
};

use crate::dto::correction::NewCorrectionMetadata;
use crate::dto::release::input::{Credit, LocalizedTitle};
use crate::dto::release::{GeneralReleaseDto, NewTrack};
use crate::repo;
pub async fn create(
    dto: GeneralReleaseDto,
    NewCorrectionMetadata {
        author_id,
        description,
    }: NewCorrectionMetadata,
    tx: &DatabaseTransaction,
) -> Result<release::Model, DbErr> {
    let new_release = dto.get_release_active_model().insert(tx).await?;
    let GeneralReleaseDto {
        artists,
        localized_titles,
        labels,
        tracks,
        credits,
        ..
    } = dto;

    let new_history =
        create_release_history_from_release_model(new_release.clone(), tx)
            .await?;

    let correction = repo::correction::create_self_approval()
        .author_id(author_id)
        .entity_type(EntityType::Release)
        .entity_id(new_release.id)
        .description(description.clone())
        .db(tx)
        .call()
        .await?;

    repo::correction::link_history(
        correction.id,
        new_history.id,
        description,
        tx,
    )
    .await?;

    create_release_artist(new_release.id, &artists, tx).await?;
    create_release_history_artist(new_history.id, &artists, tx).await?;

    create_release_localized_title(new_release.id, &localized_titles, tx)
        .await?;
    create_release_history_localized_title(
        new_history.id,
        &localized_titles,
        tx,
    )
    .await?;

    create_release_label(new_release.id, &labels, tx).await?;
    create_release_label_history(new_history.id, &labels, tx).await?;

    // TODO: Track credit
    create_release_track(new_release.id, &tracks, tx).await?;
    create_release_track_history(new_history.id, tracks.as_ref(), tx).await?;

    create_release_credit()
        .release_id(new_release.id)
        .release_history_id(new_history.id)
        .credits(credits)
        .transaction(tx)
        .call()
        .await?;

    Ok(new_release)
}

pub async fn update(
    id: i32,
    dto: GeneralReleaseDto,
    NewCorrectionMetadata {
        author_id,
        description,
    }: NewCorrectionMetadata,
    tx: &DatabaseTransaction,
) -> Result<release::Model, DbErr> {
    let update_time = Utc::now();

    let mut release_active_model = dto.get_release_active_model();
    release_active_model.id = Set(id);
    release_active_model.updated_at = Set(update_time.into());

    let updated_release = release_active_model.update(tx).await?;
    let new_release_history =
        create_release_history_from_release_model(updated_release.clone(), tx)
            .await?;

    let correction = correction::ActiveModel {
        id: NotSet,
        status: Set(CorrectionStatus::Pending),
        r#type: Set(CorrectionType::Update),
        entity_type: Set(EntityType::Release),
        entity_id: Set(id),
        description: Set(description.clone()),
        created_at: Set(update_time.into()),
        handled_at: NotSet,
    }
    .insert(tx)
    .await?;

    repo::correction::link_history(
        correction.id,
        new_release_history.id,
        description,
        tx,
    )
    .await?;

    correction_user::ActiveModel {
        correction_id: Set(correction.id),
        user_id: Set(author_id),
        user_type: Set(CorrectionUserType::Author),
    }
    .insert(tx)
    .await?;

    update_release_artist(updated_release.id, &dto.artists, tx).await?;
    create_release_history_artist(new_release_history.id, &dto.artists, tx)
        .await?;

    Ok(updated_release)
}

async fn create_release_history_from_release_model(
    model: release::Model,
    tx: &DatabaseTransaction,
) -> Result<release_history::Model, DbErr> {
    release_history::ActiveModel::from(model).insert(tx).await
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

async fn create_release_history_artist(
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

async fn create_release_history_localized_title(
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

#[builder]
async fn create_release_credit(
    release_id: i32,
    release_history_id: i32,
    credits: Vec<Credit>,
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
