use std::vec;

use entity::sea_orm_active_enums::ChangeRequestStatus;
use entity::{
    change_request, change_request_revision, song, song_credit,
    song_credit_history, song_history, song_language, song_language_history,
    song_localized_title, song_localized_title_history,
};
use itertools::izip;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DatabaseTransaction, DbErr, EntityTrait, IntoActiveModel};

use crate::dto::song::NewSong;

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
    let mut res = create_many(vec![data], tx).await?;
    let first = res.swap_remove(0);
    Ok(first)
}

pub async fn create_many(
    data: Vec<NewSong>,
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>, DbErr> {
    let new_songs = song::Entity::insert_many(
        data.iter().map(IntoActiveModel::into_active_model),
    )
    .exec_with_returning_many(tx)
    .await?;

    let new_song_historys = song_history::Entity::insert_many(
        new_songs.iter().map(|song| song.into_active_model()),
    )
    .exec_with_returning_many(tx)
    .await?;

    let new_change_requests =
        change_request::Entity::insert_many(data.iter().map(|song| {
            change_request::ActiveModel {
                id: NotSet,
                request_status: Set(ChangeRequestStatus::Approved),
                request_type: Set(
                    entity::sea_orm_active_enums::ChangeRequestType::Create,
                ),
                entity_type: Set(
                    entity::sea_orm_active_enums::EntityType::Song,
                ),
                description: Set(song.metadata.description.clone()),
                created_at: NotSet,
                handled_at: NotSet,
            }
        }))
        .exec_with_returning_many(tx)
        .await?;

    change_request_revision::Entity::insert_many(
        new_song_historys
            .iter()
            .zip(new_change_requests.into_iter())
            .map(|(song, request)| change_request_revision::ActiveModel {
                change_request_id: Set(request.id),
                entity_history_id: Set(song.id),
            }),
    )
    .exec_with_returning_many(tx)
    .await?;

    let (
        mut language_active_models,
        mut language_history_active_models,
        mut localized_title_active_models,
        mut localized_title_history_active_models,
        mut credit_active_models,
        mut credit_history_active_models,
    ) = (vec![], vec![], vec![], vec![], vec![], vec![]);

    izip!(data.iter(), new_songs.iter(), new_song_historys.iter()).for_each(
        |(data, new_song, new_song_history)| {
            if let Some(languages) = &data.languages {
                languages.iter().for_each(|language_id| {
                    language_active_models.push(
                        song_language::Model {
                            song_id: new_song.id,
                            language_id: *language_id,
                        }
                        .into_active_model(),
                    );

                    language_history_active_models.push(
                        song_language_history::Model {
                            history_id: new_song_history.id,
                            language_id: *language_id,
                        }
                        .into_active_model(),
                    );
                });
            }

            if let Some(localized_titles) = &data.localized_titles {
                localized_titles.iter().for_each(|localized_title| {
                    localized_title_active_models.push(
                        song_localized_title::ActiveModel {
                            id: NotSet,
                            song_id: Set(new_song.id),
                            language_id: Set(localized_title.language_id),
                            value: Set(localized_title.title.clone()),
                        },
                    );

                    localized_title_history_active_models.push(
                        song_localized_title_history::ActiveModel {
                            id: NotSet,
                            history_id: Set(new_song_history.id),
                            language_id: Set(localized_title.language_id),
                            value: Set(localized_title.title.clone()),
                        },
                    );
                });
            }

            if let Some(credits) = &data.credits {
                credits.iter().for_each(|credit| {
                    credit_active_models.push(song_credit::ActiveModel {
                        artist_id: Set(credit.artist_id),
                        song_id: Set(new_song.id),
                        role_id: Set(credit.role_id),
                    });
                    credit_history_active_models.push(
                        song_credit_history::ActiveModel {
                            history_id: Set(new_song_history.id),
                            artist_id: Set(credit.artist_id),
                            role_id: Set(credit.role_id),
                        },
                    );
                });
            }
        },
    );

    song_language::Entity::insert_many(language_active_models)
        .exec(tx)
        .await?;

    song_language_history::Entity::insert_many(language_history_active_models)
        .exec(tx)
        .await?;

    song_localized_title::Entity::insert_many(localized_title_active_models)
        .exec(tx)
        .await?;

    song_localized_title_history::Entity::insert_many(
        localized_title_history_active_models,
    )
    .exec(tx)
    .await?;

    song_credit::Entity::insert_many(credit_active_models)
        .exec(tx)
        .await?;

    song_credit_history::Entity::insert_many(credit_history_active_models)
        .exec(tx)
        .await?;

    Ok(new_songs)
}
