use entity::sea_orm_active_enums::ChangeRequestStatus;
use entity::{
    change_request, change_request_revision, song, song_credit,
    song_credit_history, song_history, song_language, song_language_history,
    song_localized_title, song_localized_title_history,
};
use sea_orm::sea_query::{Func, SimpleExpr};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    DatabaseConnection, DatabaseTransaction, EntityTrait, IntoActiveModel,
    Order, QueryOrder, QuerySelect,
};

use crate::error::SongServiceError;
use crate::model;
use crate::model::song::NewSong;

type Result<T> = std::result::Result<T, SongServiceError>;

pub async fn find_by_id(
    id: i32,
    db: &DatabaseConnection,
) -> Result<Option<song::Model>> {
    song::Entity::find_by_id(id)
        .one(db)
        .await
        .map_err(Into::into)
}

// TODO: move this to release track
pub async fn random(
    count: u64,
    db: &DatabaseConnection,
) -> Result<Vec<song::Model>> {
    song::Entity::find()
        .order_by(SimpleExpr::FunctionCall(Func::random()), Order::Desc)
        .limit(count)
        .all(db)
        .await
        .map_err(Into::into)
}

pub async fn create(
    data: NewSong,
    tx: &DatabaseTransaction,
) -> Result<song::Model> {
    let new_song = song::Entity::insert((&data).into_active_model())
        .exec_with_returning(tx)
        .await?;

    let new_song_history =
        song_history::Entity::insert((&new_song).into_active_model())
            .exec_with_returning(tx)
            .await?;

    if let Some(credits) = data.credits {
        song_credit::Entity::insert_many(
            credits.iter().map(IntoActiveModel::into_active_model),
        )
        .exec(tx)
        .await?;

        song_credit_history::Entity::insert_many(credits.iter().map(
            |credit| {
                song_credit_history::Model {
                    history_id: new_song_history.id,
                    artist_id: credit.artist_id,
                    role_id: credit.role_id,
                }
                .into_active_model()
            },
        ))
        .exec(tx)
        .await?;
    }

    if let Some(languages) = data.languages {
        song_language::Entity::insert_many(languages.iter().map(
            |language_id| {
                song_language::Model {
                    song_id: new_song.id,
                    language_id: *language_id,
                }
                .into_active_model()
            },
        ))
        .exec(tx)
        .await?;
        song_language_history::Entity::insert_many(languages.iter().map(
            |language_id| {
                song_language_history::Model {
                    history_id: new_song_history.id,
                    language_id: *language_id,
                }
                .into_active_model()
            },
        ))
        .exec(tx)
        .await?;
    }

    if let Some(localized_titles) = data.localized_titles {
        song_localized_title::Entity::insert_many(localized_titles.iter().map(
            |localized_title| song_localized_title::ActiveModel {
                id: NotSet,
                song_id: Set(new_song.id),
                language_id: Set(localized_title.language_id),
                value: Set(localized_title.title.clone()),
            },
        ))
        .exec(tx)
        .await?;

        song_localized_title_history::Entity::insert_many(
            localized_titles.iter().map(|localized_title| {
                song_localized_title_history::ActiveModel {
                    id: NotSet,
                    history_id: Set(new_song_history.id),
                    language_id: Set(localized_title.language_id),
                    value: Set(localized_title.title.clone()),
                }
            }),
        )
        .exec(tx)
        .await?;
    }

    let new_change_request = model::change_request::create()
        .song()
        .author_id(data.metadata.author_id)
        .description(data.metadata.description)
        .entity_created_at(new_song.created_at)
        .db(tx)
        .call()
        .await?;

    model::change_request::link_history(
        new_change_request.id,
        new_song_history.id,
        tx,
    )
    .await?;

    Ok(new_song)
}

pub async fn create_many(
    data: Vec<NewSong>,
    tx: &DatabaseTransaction,
) -> Result<Vec<song::Model>> {
    unimplemented!();
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
            .into_iter()
            .zip(new_change_requests.into_iter())
            .map(|(song, request)| change_request_revision::ActiveModel {
                change_request_id: Set(request.id),
                entity_history_id: Set(song.id),
            }),
    )
    .exec_with_returning_many(tx)
    .await?;

    Ok(new_songs)
}
