use entity::sea_orm_active_enums::{
    CorrectionStatus, CorrectionType, EntityType,
};
use entity::{
    correction, correction_revision, song, song_credit, song_credit_history,
    song_history, song_language, song_language_history, song_localized_title,
    song_localized_title_history,
};
use futures::future;
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityName,
    EntityTrait, IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};

use crate::dto::song::{LocalizedTitle, NewSong, NewSongCredit};
use crate::error::RepositoryError;
use crate::repo;

pub async fn find_by_id(
    id: i32,
    tx: &DatabaseTransaction,
) -> Result<Option<song::Model>, DbErr> {
    song::Entity::find_by_id(id).one(tx).await
}

pub async fn create(
    data: NewSong,
    tx: &DatabaseTransaction,
) -> Result<song::Model, DbErr> {
    create_many(&[data], tx)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| {
            DbErr::Custom("No song created, this should not happen".into())
        })
}

pub async fn create_many(
    data: &[NewSong],
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let new_songs = create_many_songs_and_link_relations(data, tx).await?;

    let new_corrections = future::try_join_all(
        new_songs.iter().zip(data.iter()).map(async |(song, data)| {
            // TODO: create many self approval
            repo::correction::create_self_approval()
                .author_id(data.metadata.author_id)
                .entity_type(EntityType::Song)
                .entity_id(song.id)
                .db(tx)
                .call()
                .await
        }),
    )
    .await?;

    let new_song_histories =
        create_many_song_histories_and_link_relations(data, tx).await?;

    let revisions = izip!(
        data.iter(),
        new_song_histories.iter(),
        new_corrections.iter()
    )
    .map(
        |(item, correction, history)| correction_revision::ActiveModel {
            entity_history_id: Set(history.id),
            correction_id: Set(correction.id),
            description: item.metadata.description.clone().into_active_value(),
        },
    )
    .collect_vec();

    correction_revision::Entity::insert_many(revisions)
        .exec(tx)
        .await?;

    Ok(new_songs)
}

pub async fn create_update_correction(
    song_id: i32,
    data: NewSong,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let correction = repo::correction::create()
        .author_id(data.metadata.author_id)
        .entity_type(EntityType::Song)
        .status(CorrectionStatus::Pending)
        .r#type(CorrectionType::Update)
        .entity_id(song_id)
        .db(tx)
        .call()
        .await?;

    let description = data.metadata.description.clone().into_active_value();

    let history = create_many_song_histories_and_link_relations(&[data], tx)
        .await?
        .into_iter()
        .next()
        .expect(
            "song history was inserted but not returned, this should not happen",
        );

    correction_revision::Entity::insert(correction_revision::ActiveModel {
        entity_history_id: Set(history.id),
        correction_id: Set(correction.id),
        description,
    })
    .exec(tx)
    .await?;

    Ok(())
}

pub async fn update_update_correction(
    correction: correction::Model,
    data: NewSong,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let description = data.metadata.description.clone().into_active_value();

    let history = create_many_song_histories_and_link_relations(&[data], tx)
        .await?
        .into_iter()
        .next()
        .expect(
            "song history was inserted but not returned, this should not happen",
        );

    correction_revision::Entity::insert(correction_revision::ActiveModel {
        entity_history_id: Set(history.id),
        correction_id: Set(correction.id),
        description,
    })
    .exec(tx)
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

    let history = song_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or_else(|| RepositoryError::UnexpRelatedEntityNotFound {
            entity_name: song_history::Entity.table_name(),
        })?;

    song::ActiveModel {
        id: Set(history.id),
        title: Set(history.title),
    }
    .update(tx)
    .await?;

    let song_id = correction.entity_id;
    let history_id = history.id;

    update_credit(song_id, history_id, tx).await?;
    update_language(song_id, history_id, tx).await?;
    update_localized_title(song_id, history_id, tx).await?;

    Ok(())
}

// Relations of song:
// - credit
// - language
// - localized title

async fn create_many_songs_and_link_relations(
    data: &[NewSong],
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let new_songs =
        song::Entity::insert_many(data.iter().map_into::<song::ActiveModel>())
            .exec_with_returning_many(tx)
            .await?;

    let song_ids = new_songs.iter().map(|model| model.id).collect_vec();

    create_many_credits(
        &song_ids,
        &data.iter().map(|x| &x.credits).collect_vec(),
        tx,
    )
    .await?;

    create_many_languages(
        &song_ids,
        &data.iter().map(|x| &x.languages).collect_vec(),
        tx,
    )
    .await?;

    create_many_localized_titles(
        &song_ids,
        &data.iter().map(|x| &x.localized_titles).collect_vec(),
        tx,
    )
    .await?;

    Ok(new_songs)
}

async fn create_many_song_histories_and_link_relations(
    data: &[NewSong],
    tx: &DatabaseTransaction,
) -> Result<Vec<song_history::Model>, DbErr> {
    let new_song_histories = song_history::Entity::insert_many(
        data.iter().map_into::<song_history::ActiveModel>(),
    )
    .exec_with_returning_many(tx)
    .await?;

    let history_ids = new_song_histories
        .iter()
        .map(|model| model.id)
        .collect_vec();

    create_many_credit_histories(
        &history_ids,
        &data.iter().map(|x| &x.credits).collect_vec(),
        tx,
    )
    .await?;

    create_many_language_histories(
        &history_ids,
        &data.iter().map(|x| &x.languages).collect_vec(),
        tx,
    )
    .await?;

    create_many_localized_title_histories(
        &history_ids,
        &data.iter().map(|x| &x.localized_titles).collect_vec(),
        tx,
    )
    .await?;

    Ok(new_song_histories)
}

type CreateCreditData<'a> = (i32, &'a Option<Vec<NewSongCredit>>);

async fn create_many_credits(
    song_ids: &[i32],
    credits: &[&Option<Vec<NewSongCredit>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models =
        song_ids
            .iter()
            .zip(credits)
            .flat_map(|(song_id, maybe_credits)| {
                maybe_credits.iter().flat_map(|credits| {
                    credits.iter().map(|credit| song_credit::ActiveModel {
                        artist_id: Set(credit.artist_id),
                        song_id: Set(*song_id),
                        role_id: Set(credit.role_id),
                    })
                })
            });

    song_credit::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_many_credit_histories(
    history_ids: &[i32],
    credits: &[&Option<Vec<NewSongCredit>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = history_ids.iter().zip(credits).flat_map(
        |(history_id, maybe_credits)| {
            maybe_credits.iter().flat_map(|credit| {
                credit
                    .iter()
                    .map(|credit| song_credit_history::ActiveModel {
                        artist_id: Set(credit.artist_id),
                        history_id: Set(*history_id),
                        role_id: Set(credit.role_id),
                    })
            })
        },
    );

    song_credit_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_credit(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_credit::Entity::delete_many()
        .filter(song_credit::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let new_credits = song_credit_history::Entity::find()
        .filter(song_credit_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if !new_credits.is_empty() {
        let active_models =
            new_credits.iter().map(|credit| song_credit::ActiveModel {
                artist_id: Set(credit.artist_id),
                song_id: Set(song_id),
                role_id: Set(credit.role_id),
            });

        song_credit::Entity::insert_many(active_models)
            .exec(tx)
            .await?;
    }

    Ok(())
}

async fn create_many_languages(
    song_ids: &[i32],
    languages: &[&Option<Vec<i32>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = song_ids
        .iter()
        .zip(languages)
        .flat_map(|(song_id, languages)| {
            languages.iter().flat_map(|langs| {
                langs.iter().map(|language_id| song_language::ActiveModel {
                    song_id: song_id.into_active_value(),
                    language_id: language_id.into_active_value(),
                })
            })
        })
        .collect_vec();

    if !models.is_empty() {
        song_language::Entity::insert_many(models).exec(tx).await?;
    }

    Ok(())
}

async fn create_many_language_histories(
    history_ids: &[i32],
    languages: &[&Option<Vec<i32>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = history_ids
        .iter()
        .zip(languages)
        .flat_map(|(history_id, languages)| {
            languages.iter().flat_map(|langs| {
                langs.iter().map(|language_id| {
                    song_language_history::ActiveModel {
                        history_id: history_id.into_active_value(),
                        language_id: language_id.into_active_value(),
                    }
                })
            })
        })
        .collect_vec();

    if !models.is_empty() {
        song_language_history::Entity::insert_many(models)
            .exec(tx)
            .await?;
    }

    Ok(())
}

async fn update_language(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_language::Entity::delete_many()
        .filter(song_language::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let new_languages = song_language_history::Entity::find()
        .filter(song_language_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if !new_languages.is_empty() {
        let active_models =
            new_languages
                .iter()
                .map(|language| song_language::ActiveModel {
                    song_id: song_id.into_active_value(),
                    language_id: language.language_id.into_active_value(),
                });

        song_language::Entity::insert_many(active_models)
            .exec(tx)
            .await?;
    }

    Ok(())
}

async fn create_many_localized_titles(
    song_ids: &[i32],
    localized_titles: &[&Option<Vec<LocalizedTitle>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = song_ids
        .iter()
        .zip(localized_titles)
        .flat_map(|(song_id, localized_titles)| {
            localized_titles.iter().flat_map(|localized_titles| {
                localized_titles.iter().map(|localized_title| {
                    song_localized_title::ActiveModel {
                        id: NotSet,
                        song_id: song_id.into_active_value(),
                        language_id: localized_title
                            .language_id
                            .into_active_value(),
                        title: localized_title
                            .title
                            .clone()
                            .into_active_value(),
                    }
                })
            })
        })
        .collect_vec();

    if !models.is_empty() {
        song_localized_title::Entity::insert_many(models)
            .exec(tx)
            .await?;
    }

    Ok(())
}

async fn create_many_localized_title_histories(
    history_ids: &[i32],
    localized_titles: &[&Option<Vec<LocalizedTitle>>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = history_ids
        .iter()
        .zip(localized_titles)
        .flat_map(|(song_id, localized_titles)| {
            localized_titles.iter().flat_map(|localized_titles| {
                localized_titles.iter().map(|localized_title| {
                    song_localized_title_history::ActiveModel {
                        id: NotSet,
                        history_id: song_id.into_active_value(),
                        language_id: localized_title
                            .language_id
                            .into_active_value(),
                        title: localized_title
                            .title
                            .clone()
                            .into_active_value(),
                    }
                })
            })
        })
        .collect_vec();

    if !models.is_empty() {
        song_localized_title_history::Entity::insert_many(models)
            .exec(tx)
            .await?;
    }

    Ok(())
}

async fn update_localized_title(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_localized_title::Entity::delete_many()
        .filter(song_localized_title::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let new_localized_titles = song_localized_title_history::Entity::find()
        .filter(song_localized_title_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if !new_localized_titles.is_empty() {
        let active_models =
            new_localized_titles.iter().map(|localized_title| {
                song_localized_title::ActiveModel {
                    id: NotSet,
                    song_id: song_id.into_active_value(),
                    language_id: localized_title
                        .language_id
                        .into_active_value(),
                    title: localized_title.title.clone().into_active_value(),
                }
            });

        song_localized_title::Entity::insert_many(active_models)
            .exec(tx)
            .await?;
    }

    Ok(())
}
