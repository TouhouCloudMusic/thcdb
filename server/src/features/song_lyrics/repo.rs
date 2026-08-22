use entity::{correction_revision, song_lyrics, song_lyrics_history};
use infra_db::SeaOrmTxRepo;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder, QueryTrait,
};

use crate::features::song_lyrics::model::NewSongLyrics;
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};

pub(super) async fn create(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DatabaseError> {
    create_lyrics(repo.conn(), data)
        .await
        .db_operation("create song lyrics")
}

pub(super) async fn create_history(
    repo: &SeaOrmTxRepo,
    data: &NewSongLyrics,
) -> Result<i32, DatabaseError> {
    create_history_record(repo.conn(), data)
        .await
        .db_operation("create song lyrics history")
}

async fn unset_song_main_lyrics(
    song_id: i32,
    exclude_id: impl Into<Option<i32>>,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    let query = song_lyrics::Entity::update_many()
        .col_expr(song_lyrics::Column::IsMain, false.into())
        .filter(song_lyrics::Column::SongId.eq(song_id))
        .apply_if(exclude_id.into(), |q, id| {
            q.filter(song_lyrics::Column::Id.ne(id))
        });

    query.exec(conn).await?;

    Ok(())
}

async fn create_lyrics(
    conn: &impl ConnectionTrait,
    lyrics: &NewSongLyrics,
) -> Result<i32, DbErr> {
    if lyrics.is_main {
        unset_song_main_lyrics(lyrics.song_id, None, conn).await?;
    }

    let model = song_lyrics::ActiveModel {
        id: NotSet,
        song_id: Set(lyrics.song_id),
        language_id: Set(lyrics.language_id),
        content: Set(lyrics.content.clone()),
        is_main: Set(lyrics.is_main),
    };

    let result = model.insert(conn).await?;
    Ok(result.id)
}

async fn create_history_record(
    conn: &impl ConnectionTrait,
    lyrics: &NewSongLyrics,
) -> Result<i32, DbErr> {
    let model = song_lyrics_history::ActiveModel {
        id: NotSet,
        song_id: Set(lyrics.song_id),
        language_id: Set(lyrics.language_id),
        content: Set(lyrics.content.clone()),
        is_main: Set(lyrics.is_main),
    };

    let result = model.insert(conn).await?;
    Ok(result.id)
}

pub(crate) async fn apply_update(
    correction: entity::correction::Model,
    conn: &impl ConnectionTrait,
) -> Result<(), DatabaseError> {
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    let history =
        song_lyrics_history::Entity::find_by_id(revision.entity_history_id)
            .one(conn)
            .await?
            .ok_or(BrokenEntityReference {
                entity: "song lyrics history",
                id: revision.entity_history_id,
            })?;

    let existing = song_lyrics::Entity::find()
        .filter(song_lyrics::Column::SongId.eq(history.song_id))
        .filter(song_lyrics::Column::LanguageId.eq(history.language_id))
        .one(conn)
        .await?;

    if let Some(update_target) = existing {
        if history.is_main {
            unset_song_main_lyrics(history.song_id, update_target.id, conn)
                .await?;
        }

        let model = song_lyrics::ActiveModel {
            id: Set(update_target.id),
            song_id: NotSet,
            language_id: NotSet,
            content: Set(history.content),
            is_main: Set(history.is_main),
        };
        model.update(conn).await?;
    } else {
        Err(BrokenEntityReference {
            entity: "song lyrics",
            id: correction.entity_id,
        })?;
    }

    Ok(())
}
