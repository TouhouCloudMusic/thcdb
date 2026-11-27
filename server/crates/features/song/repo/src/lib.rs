mod history;
pub mod list;
pub mod read;
pub mod write;

use entity::{
    song, song_artist, song_artist_history, song_credit, song_credit_history,
    song_history, song_language, song_language_history, song_link,
    song_link_history, song_localized_title, song_localized_title_history,
    song_relation, song_relation_history,
};
use futures_util::try_join;
pub use history::{
    PendingSongHistory, load_history_snapshot, load_pending_history,
};
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter};

async fn update_artists(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_artists", async {
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
    })
    .await
}

async fn update_credits(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_credits", async {
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
    })
    .await
}

async fn update_languages(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_languages", async {
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

        let models =
            languages.iter().map(|language| song_language::ActiveModel {
                song_id: Set(song_id),
                language_id: Set(language.language_id),
            });

        song_language::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

async fn update_localized_titles(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_localized_titles", async {
        song_localized_title::Entity::delete_many()
            .filter(song_localized_title::Column::SongId.eq(song_id))
            .exec(tx)
            .await?;

        let titles = song_localized_title_history::Entity::find()
            .filter(
                song_localized_title_history::Column::HistoryId.eq(history_id),
            )
            .all(tx)
            .await?;

        if titles.is_empty() {
            return Ok(());
        }

        let models =
            titles
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
    })
    .await
}

async fn update_relations(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_relations", async {
        song_relation::Entity::delete_many()
            .filter(
                song_relation::Column::SourceId
                    .eq(song_id)
                    .or(song_relation::Column::DerivedId.eq(song_id)),
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

        let models =
            relations.iter().map(|relation| song_relation::ActiveModel {
                id: NotSet,
                source_id: Set(relation.source_id),
                derived_id: Set(relation.derived_id),
                relation_type: Set(relation.relation_type),
                description: Set(relation.description.clone()),
            });

        song_relation::Entity::insert_many(models).exec(tx).await?;

        Ok(())
    })
    .await
}

async fn update_links(
    song_id: i32,
    history_id: i32,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    infra_db::trace("song.update_links", async {
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
    })
    .await
}

#[infra_db::observe("song.apply_update")]
pub async fn apply_history(
    tx: &DatabaseTransaction,
    song_id: i32,
    history_id: i32,
) -> Result<(), DatabaseError> {
    let history = song_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "song history",
            id: history_id,
        })?;

    let active_model = song::ActiveModel {
        id: Set(song_id),
        title: Set(history.title),
    };

    active_model.update(tx).await?;

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
