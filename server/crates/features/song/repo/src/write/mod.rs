mod model;

use domain::shared::{HttpUrl, NewLocalizedName};
use entity::{
    song, song_artist, song_artist_history, song_credit, song_credit_history,
    song_history, song_language, song_language_history, song_link,
    song_link_history, song_localized_title, song_localized_title_history,
    song_relation, song_relation_history,
};
use futures_util::try_join;
use infra_db::DatabaseTransaction;
use infra_db::error::DatabaseError;
pub use model::{
    NewSong, NewSongCredit, NewSongRelation, SongRelationDirection,
    ValidationError,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, DbErr, EntityTrait, IntoActiveValue};
use sea_query::OnConflict;

async fn create_song_and_relations(
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song::Model, DbErr> {
    infra_db::trace("song.insert_with_relations", async {
        let song_model = song::ActiveModel {
            id: NotSet,
            title: data.title.to_string().into_active_value(),
        };

        let song = song_model.insert(tx).await?;

        try_join!(
            create_artists(song.id, data.artists.as_deref(), tx),
            create_credits(song.id, data.credits.as_deref(), tx),
            create_languages(song.id, data.languages.as_deref(), tx),
            create_localized_titles(
                song.id,
                data.localized_titles.as_deref(),
                tx
            ),
            create_links(song.id, data.links.as_deref(), tx),
            create_relations(song.id, data.relations.as_deref(), tx),
        )?;

        Ok(song)
    })
    .await
}

async fn create_song_history_and_relations(
    song_id: i32,
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song_history::Model, DbErr> {
    infra_db::trace("song.insert_history_with_relations", async {
        let history_model = song_history::ActiveModel {
            id: NotSet,
            title: data.title.to_string().into_active_value(),
        };

        let history = history_model.insert(tx).await?;

        try_join!(
            create_artist_histories(history.id, data.artists.as_deref(), tx),
            create_credit_histories(history.id, data.credits.as_deref(), tx),
            create_language_histories(
                history.id,
                data.languages.as_deref(),
                tx
            ),
            create_localized_title_histories(
                history.id,
                data.localized_titles.as_deref(),
                tx
            ),
            create_link_histories(history.id, data.links.as_deref(), tx),
            create_relation_histories(
                song_id,
                history.id,
                data.relations.as_deref(),
                tx
            ),
        )?;

        Ok(history)
    })
    .await
}

async fn create_artists(
    song_id: i32,
    artists: Option<&[i32]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(artists) = artists else {
        return Ok(());
    };

    if artists.is_empty() {
        return Ok(());
    }

    let models = artists.iter().map(|artist_id| song_artist::ActiveModel {
        song_id: song_id.into_active_value(),
        artist_id: (*artist_id).into_active_value(),
    });

    song_artist::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_artist_histories(
    history_id: i32,
    artists: Option<&[i32]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(artists) = artists else {
        return Ok(());
    };

    if artists.is_empty() {
        return Ok(());
    }

    let models =
        artists
            .iter()
            .map(|artist_id| song_artist_history::ActiveModel {
                history_id: history_id.into_active_value(),
                artist_id: (*artist_id).into_active_value(),
            });

    song_artist_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_credits(
    song_id: i32,
    credits: Option<&[NewSongCredit]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(credits) = credits else {
        return Ok(());
    };

    if credits.is_empty() {
        return Ok(());
    }

    let models = credits.iter().map(|credit| song_credit::ActiveModel {
        id: NotSet,
        artist_id: Set(credit.artist_id),
        song_id: Set(song_id),
        role_id: credit.role_id.into_active_value(),
    });

    song_credit::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_credit_histories(
    history_id: i32,
    credits: Option<&[NewSongCredit]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(credits) = credits else {
        return Ok(());
    };

    if credits.is_empty() {
        return Ok(());
    }

    let models =
        credits
            .iter()
            .map(|credit| song_credit_history::ActiveModel {
                id: NotSet,
                artist_id: Set(credit.artist_id),
                history_id: Set(history_id),
                role_id: credit.role_id.into_active_value(),
            });

    song_credit_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_languages(
    song_id: i32,
    languages: Option<&[i32]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(languages) = languages else {
        return Ok(());
    };

    if languages.is_empty() {
        return Ok(());
    }

    let models =
        languages
            .iter()
            .map(|language_id| song_language::ActiveModel {
                song_id: song_id.into_active_value(),
                language_id: language_id.into_active_value(),
            });

    song_language::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_language_histories(
    history_id: i32,
    languages: Option<&[i32]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(languages) = languages else {
        return Ok(());
    };

    if languages.is_empty() {
        return Ok(());
    }

    let models = languages.iter().map(|language_id| {
        song_language_history::ActiveModel {
            history_id: history_id.into_active_value(),
            language_id: language_id.into_active_value(),
        }
    });

    song_language_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_localized_titles(
    song_id: i32,
    localized_titles: Option<&[NewLocalizedName]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(localized_titles) = localized_titles else {
        return Ok(());
    };

    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles.iter().map(|localized_title| {
        song_localized_title::ActiveModel {
            id: NotSet,
            song_id: song_id.into_active_value(),
            language_id: localized_title.language_id.into_active_value(),
            title: localized_title.name.clone().into_active_value(),
        }
    });

    song_localized_title::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_localized_title_histories(
    history_id: i32,
    localized_titles: Option<&[NewLocalizedName]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(localized_titles) = localized_titles else {
        return Ok(());
    };

    if localized_titles.is_empty() {
        return Ok(());
    }

    let models = localized_titles.iter().map(|localized_title| {
        song_localized_title_history::ActiveModel {
            id: NotSet,
            history_id: history_id.into_active_value(),
            language_id: localized_title.language_id.into_active_value(),
            title: localized_title.name.clone().into_active_value(),
        }
    });

    song_localized_title_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_relations(
    song_id: i32,
    relations: Option<&[NewSongRelation]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(relations) = relations else {
        return Ok(());
    };

    if relations.is_empty() {
        return Ok(());
    }

    let models = relations.iter().map(|relation| {
        let (source_id, derived_id) = relation_song_ids(song_id, relation);

        song_relation::ActiveModel {
            id: NotSet,
            source_id: Set(source_id),
            derived_id: Set(derived_id),
            relation_type: Set(relation.relation_type),
            description: Set(relation.description.clone()),
        }
    });

    song_relation::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_relation_histories(
    song_id: i32,
    history_id: i32,
    relations: Option<&[NewSongRelation]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(relations) = relations else {
        return Ok(());
    };

    if relations.is_empty() {
        return Ok(());
    }

    let models = relations.iter().map(|relation| {
        let (source_id, derived_id) = relation_song_ids(song_id, relation);

        song_relation_history::ActiveModel {
            id: NotSet,
            history_id: Set(history_id),
            source_id: Set(source_id),
            derived_id: Set(derived_id),
            relation_type: Set(relation.relation_type),
            description: Set(relation.description.clone()),
        }
    });

    song_relation_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

const fn relation_song_ids(
    song_id: i32,
    relation: &NewSongRelation,
) -> (i32, i32) {
    match relation.direction {
        SongRelationDirection::Source => (song_id, relation.related_song_id),
        SongRelationDirection::Derived => (relation.related_song_id, song_id),
    }
}

async fn create_links(
    song_id: i32,
    links: Option<&[HttpUrl]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| song_link::ActiveModel {
        id: NotSet,
        song_id: Set(song_id),
        url: Set(link.to_string()),
    });

    song_link::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                song_link::Column::SongId,
                song_link::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(tx)
        .await?;

    Ok(())
}

async fn create_link_histories(
    history_id: i32,
    links: Option<&[HttpUrl]>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let Some(links) = links.filter(|links| !links.is_empty()) else {
        return Ok(());
    };

    let models = links.iter().map(|link| song_link_history::ActiveModel {
        id: NotSet,
        history_id: Set(history_id),
        url: Set(link.to_string()),
    });

    song_link_history::Entity::insert_many(models)
        .on_conflict(
            OnConflict::columns([
                song_link_history::Column::HistoryId,
                song_link_history::Column::Url,
            ])
            .do_nothing()
            .to_owned(),
        )
        .on_empty_do_nothing()
        .exec_without_returning(tx)
        .await?;

    Ok(())
}

/// Inserts the current song in the caller's transaction.
///
/// Validate `data` with `None` before calling this function.
#[infra_db::observe("song.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    Ok(create_song_and_relations(data, tx).await?.id)
}

/// Inserts a song snapshot in the caller's transaction.
///
/// `song_id` is the live song ID used to orient relations. Validate edits
/// with `Some(song_id)` before calling this function.
#[infra_db::observe("song.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    song_id: i32,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    Ok(create_song_history_and_relations(song_id, data, tx)
        .await?
        .id)
}
