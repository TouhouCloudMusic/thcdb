use domain::shared::{HttpUrl, NewLocalizedName};
use entity::{
    correction_revision, song, song_artist, song_artist_history, song_credit,
    song_credit_history, song_history, song_language, song_language_history,
    song_link, song_link_history, song_localized_title,
    song_localized_title_history, song_relation, song_relation_history,
};
use futures_util::try_join;
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseTransaction, DbErr, EntityTrait,
    IntoActiveValue, ModelTrait, QueryFilter, QueryOrder,
};
use sea_query::OnConflict;

use crate::features::song::model::{NewSong, NewSongCredit, NewSongRelation};
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    create_song_and_relations(data, repo.conn())
        .await
        .map(|song| song.id)
        .db_operation("create song")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSong,
) -> Result<i32, DatabaseError> {
    create_song_history_and_relations(data, repo.conn())
        .await
        .map(|song| song.id)
        .db_operation("create song history")
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    tx: &DatabaseTransaction,
) -> Result<(), DatabaseError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history = song_history::Entity::find_by_id(revision.entity_history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "song history",
            id: revision.entity_history_id,
        })?;

    let active_model = song::ActiveModel {
        id: Set(correction.entity_id),
        title: Set(history.title),
    };

    active_model.update(tx).await?;

    let song_id = correction.entity_id;
    let history_id = revision.entity_history_id;

    try_join!(
        update_artists(song_id, history_id, tx),
        update_credits(song_id, history_id, tx),
        update_languages(song_id, history_id, tx),
        update_localized_titles(song_id, history_id, tx),
        update_links(song_id, history_id, tx),
        update_relations(song_id, history_id, tx),
    )?;

    Ok(())
}

async fn update_artists(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_artist::Entity::delete_many()
        .filter(song_artist::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let artists = song_artist_history::Entity::find()
        .filter(song_artist_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if artists.is_empty() {
        return Ok(());
    }

    let models = artists.iter().map(|a| song_artist::ActiveModel {
        song_id: Set(song_id),
        artist_id: Set(a.artist_id),
    });

    song_artist::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_credits(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_credit::Entity::delete_many()
        .filter(song_credit::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let credits = song_credit_history::Entity::find()
        .filter(song_credit_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if credits.is_empty() {
        return Ok(());
    }

    let models = credits.iter().map(|credit| song_credit::ActiveModel {
        id: NotSet,
        song_id: Set(song_id),
        artist_id: Set(credit.artist_id),
        role_id: Set(credit.role_id),
    });

    song_credit::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_languages(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_language::Entity::delete_many()
        .filter(song_language::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let languages = song_language_history::Entity::find()
        .filter(song_language_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if languages.is_empty() {
        return Ok(());
    }

    let models = languages.iter().map(|language| song_language::ActiveModel {
        song_id: Set(song_id),
        language_id: Set(language.language_id),
    });

    song_language::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_localized_titles(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_localized_title::Entity::delete_many()
        .filter(song_localized_title::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let titles = song_localized_title_history::Entity::find()
        .filter(song_localized_title_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if titles.is_empty() {
        return Ok(());
    }

    let models = titles
        .iter()
        .map(|title| song_localized_title::ActiveModel {
            id: NotSet,
            song_id: Set(song_id),
            language_id: Set(title.language_id),
            title: Set(title.title.clone()),
        });

    song_localized_title::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn update_relations(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_relation::Entity::delete_many()
        .filter(
            song_relation::Column::FirstId
                .eq(song_id)
                .or(song_relation::Column::SecondId.eq(song_id)),
        )
        .exec(tx)
        .await?;

    let relations = song_relation_history::Entity::find()
        .filter(song_relation_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if relations.is_empty() {
        return Ok(());
    }

    let models = relations.iter().map(|relation| {
        let first_id = song_id.min(relation.related_song_id);
        let second_id = song_id.max(relation.related_song_id);

        song_relation::ActiveModel {
            id: NotSet,
            first_id: Set(first_id),
            second_id: Set(second_id),
            relation_type_id: Set(relation.relation_type_id),
            description: Set(relation.description.clone()),
        }
    });

    song_relation::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn update_links(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    song_link::Entity::delete_many()
        .filter(song_link::Column::SongId.eq(song_id))
        .exec(tx)
        .await?;

    let links = song_link_history::Entity::find()
        .filter(song_link_history::Column::HistoryId.eq(history_id))
        .all(tx)
        .await?;

    if links.is_empty() {
        return Ok(());
    }

    let models = links.into_iter().map(|link| song_link::ActiveModel {
        id: NotSet,
        song_id: Set(song_id),
        url: Set(link.url),
    });

    song_link::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_song_and_relations(
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song::Model, DbErr> {
    let song_model = song::ActiveModel {
        id: NotSet,
        title: data.title.to_string().into_active_value(),
    };

    let song = song_model.insert(tx).await?;

    try_join!(
        create_artists(song.id, data.artists.as_deref(), tx),
        create_credits(song.id, data.credits.as_deref(), tx),
        create_languages(song.id, data.languages.as_deref(), tx),
        create_localized_titles(song.id, data.localized_titles.as_deref(), tx),
        create_links(song.id, data.links.as_deref(), tx),
        create_relations(song.id, data.relations.as_deref(), tx),
    )?;

    Ok(song)
}

async fn create_song_history_and_relations(
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song_history::Model, DbErr> {
    let history_model = song_history::ActiveModel {
        id: NotSet,
        title: data.title.to_string().into_active_value(),
    };

    let history = history_model.insert(tx).await?;

    try_join!(
        create_artist_histories(history.id, data.artists.as_deref(), tx),
        create_credit_histories(history.id, data.credits.as_deref(), tx),
        create_language_histories(history.id, data.languages.as_deref(), tx),
        create_localized_title_histories(
            history.id,
            data.localized_titles.as_deref(),
            tx
        ),
        create_link_histories(history.id, data.links.as_deref(), tx),
        create_relation_histories(history.id, data.relations.as_deref(), tx),
    )?;

    Ok(history)
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
        let first_id = song_id.min(relation.related_song_id);
        let second_id = song_id.max(relation.related_song_id);

        song_relation::ActiveModel {
            id: NotSet,
            first_id: Set(first_id),
            second_id: Set(second_id),
            relation_type_id: Set(relation.relation_type_id),
            description: Set(relation.description.clone()),
        }
    });

    song_relation::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_relation_histories(
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

    let models =
        relations
            .iter()
            .map(|relation| song_relation_history::ActiveModel {
                id: NotSet,
                history_id: Set(history_id),
                related_song_id: Set(relation.related_song_id),
                relation_type_id: Set(relation.relation_type_id),
                description: Set(relation.description.clone()),
            });

    song_relation_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
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
