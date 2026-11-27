mod history;
mod query;

use entity::{song_lyrics, song_lyrics_history};
pub use history::load_history_snapshot;
use infra_db::DatabaseTransaction;
use infra_db::error::{BrokenEntityReference, DatabaseError, DatabaseFailure};
pub use query::{
    FindManyFilter, FindOneFilter, SongLyrics, find_many, find_one,
};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DbErr, EntityTrait, QueryFilter, QueryTrait,
};

async fn unset_song_main_lyrics(
    song_id: i32,
    exclude_id: Option<i32>,
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    let query = song_lyrics::Entity::update_many()
        .col_expr(song_lyrics::Column::IsMain, false.into())
        .filter(song_lyrics::Column::SongId.eq(song_id))
        .apply_if(exclude_id, |q, id| q.filter(song_lyrics::Column::Id.ne(id)));

    query.exec(tx).await?;

    Ok(())
}

#[infra_db::observe("song_lyrics.create")]
pub async fn create(
    tx: &DatabaseTransaction,
    song_id: i32,
    language_id: i32,
    content: &str,
    is_main: bool,
) -> Result<i32, DatabaseError> {
    let id = infra_db::trace("song_lyrics.insert", async {
        if is_main {
            unset_song_main_lyrics(song_id, None, tx).await?;
        }

        let model = song_lyrics::ActiveModel {
            id: NotSet,
            song_id: Set(song_id),
            language_id: Set(language_id),
            content: Set(content.to_owned()),
            is_main: Set(is_main),
        };

        let result = model.insert(tx).await?;
        Ok::<_, DbErr>(result.id)
    })
    .await?;
    Ok(id)
}

#[infra_db::observe("song_lyrics.create_history")]
pub async fn create_history(
    tx: &DatabaseTransaction,
    lyrics_id: i32,
    content: &str,
    is_main: bool,
) -> Result<Option<i32>, DatabaseError> {
    let Some(lyrics) =
        song_lyrics::Entity::find_by_id(lyrics_id).one(tx).await?
    else {
        return Ok(None);
    };

    let model = song_lyrics_history::ActiveModel {
        id: NotSet,
        song_id: Set(lyrics.song_id),
        language_id: Set(lyrics.language_id),
        content: Set(content.to_owned()),
        is_main: Set(is_main),
    };
    Ok(Some(model.insert(tx).await?.id))
}

pub async fn load_edit(
    tx: &DatabaseTransaction,
    lyrics_id: i32,
    history_id: i32,
) -> Result<(song_lyrics::Model, song_lyrics_history::Model), DatabaseFailure> {
    let live = song_lyrics::Entity::find_by_id(lyrics_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "song lyrics",
            id: lyrics_id,
        })?;
    let history = song_lyrics_history::Entity::find_by_id(history_id)
        .one(tx)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "song lyrics history",
            id: history_id,
        })?;

    Ok((live, history))
}

pub async fn update(
    tx: &DatabaseTransaction,
    live: song_lyrics::Model,
    content: String,
    is_main: bool,
) -> Result<(), DatabaseFailure> {
    if is_main {
        unset_song_main_lyrics(live.song_id, Some(live.id), tx).await?;
    }

    let model = song_lyrics::ActiveModel {
        id: Set(live.id),
        song_id: NotSet,
        language_id: NotSet,
        content: Set(content),
        is_main: Set(is_main),
    };
    model.update(tx).await?;

    Ok(())
}
