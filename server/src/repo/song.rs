use entity::sea_orm_active_enums::EntityType;
use entity::{
    correction_revision, song, song_credit, song_credit_history, song_history,
    song_language, song_language_history, song_localized_title,
    song_localized_title_history,
};
use futures::future;
use itertools::{izip, Itertools};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ColumnTrait, DatabaseTransaction, DbErr, EntityTrait, IntoActiveModel,
    IntoActiveValue, QueryFilter,
};

use crate::dto::song::{LocalizedTitle, NewSong, NewSongCredit};
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
    let mut res = create_many(&[data], tx).await?;
    let first = res.swap_remove(0);
    Ok(first)
}

#[allow(clippy::too_many_lines)]
pub async fn create_many(
    data: &[NewSong],
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let new_songs = song::Entity::insert_many(
        data.iter().map(IntoActiveModel::into_active_model),
    )
    .exec_with_returning_many(tx)
    .await?;

    let new_song_histories = song_history::Entity::insert_many(
        // TODO: from &NewSong instead of from ActiveModel of song
        new_songs.iter().map(song_history::ActiveModel::from),
    )
    .exec_with_returning_many(tx)
    .await?;

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

    create_many_credits(
        new_songs
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.credits))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;
    create_many_credit_histories(
        new_song_histories
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.credits))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;

    create_many_languages(
        new_songs
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.languages))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;
    create_many_language_histories(
        new_song_histories
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.languages))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;

    create_many_localized_titles(
        new_songs
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.localized_titles))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;
    create_many_localized_title_histories(
        new_song_histories
            .iter()
            .zip(data.iter())
            .map(|(model, data)| (model.id, &data.localized_titles))
            .collect_vec()
            .as_slice(),
        tx,
    )
    .await?;

    Ok(new_songs)
}

// Relations of song:
// - credit
// - language
// - localized title

type CreateCreditData<'a> = (i32, &'a Option<Vec<NewSongCredit>>);

async fn create_many_credits(
    data: &[CreateCreditData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data.iter().flat_map(|(song_id, maybe_credits)| {
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
    data: &[CreateCreditData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data.iter().flat_map(|(history_id, maybe_credits)| {
        maybe_credits.iter().flat_map(|credit| {
            credit
                .iter()
                .map(|credit| song_credit_history::ActiveModel {
                    artist_id: Set(credit.artist_id),
                    history_id: Set(*history_id),
                    role_id: Set(credit.role_id),
                })
        })
    });

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

type CreateLanguageData<'a> = (i32, &'a Option<Vec<i32>>);

async fn create_many_languages(
    data: &[CreateLanguageData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data
        .iter()
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
    data: &[CreateLanguageData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data
        .iter()
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

type CreateLocalizedTitleData<'a> = (i32, &'a Option<Vec<LocalizedTitle>>);

async fn create_many_localized_titles(
    data: &[CreateLocalizedTitleData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data
        .iter()
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
    data: &[CreateLocalizedTitleData<'_>],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let models = data
        .iter()
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
