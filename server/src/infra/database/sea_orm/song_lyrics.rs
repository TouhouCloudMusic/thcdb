use entity::{correction_revision, song_lyrics, song_lyrics_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder, QueryTrait,
};
use snafu::ResultExt;

use super::SeaOrmTxRepo;
use crate::domain::Connection;
use crate::domain::song_lyrics::{NewSongLyrics, TxRepo};

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_lyrics_impl(lyrics, self.conn()).await.boxed()
    }

    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_history_impl(lyrics, self.conn()).await.boxed()
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        apply_update_impl(correction, self.conn()).await.boxed()
    }
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

/// Create new song lyrics record
async fn create_lyrics_impl(
    lyrics: &NewSongLyrics,
    conn: &impl ConnectionTrait,
) -> Result<i32, DbErr> {
    // Ensure only one lyrics record per song can be marked as main
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

/// Create history record for song lyrics
async fn create_history_impl(
    lyrics: &NewSongLyrics,
    conn: &impl ConnectionTrait,
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

/// Apply correction update to song lyrics
async fn apply_update_impl(
    correction: entity::correction::Model,
    conn: &impl ConnectionTrait,
) -> Result<(), DbErr> {
    // Find the latest correction revision
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or_else(|| {
            DbErr::Custom("Correction revision not found".to_string())
        })?;

    // Find the history record
    let history =
        song_lyrics_history::Entity::find_by_id(revision.entity_history_id)
            .one(conn)
            .await?
            .ok_or_else(|| {
                DbErr::Custom("Song lyrics history not found".to_string())
            })?;

    // Check if the song lyrics record already exists
    let existing = song_lyrics::Entity::find()
        .filter(song_lyrics::Column::SongId.eq(history.song_id))
        .filter(song_lyrics::Column::LanguageId.eq(history.language_id))
        .one(conn)
        .await?;

    if let Some(update_target) = existing {
        // Ensure only one lyrics record per song can be marked as main
        if history.is_main {
            unset_song_main_lyrics(history.song_id, update_target.id, conn)
                .await?;
        }

        // Update existing record
        let model = song_lyrics::ActiveModel {
            id: Set(update_target.id),
            song_id: NotSet,
            language_id: NotSet,
            content: Set(history.content),
            is_main: Set(history.is_main),
        };
        model.update(conn).await?;
    } else {
        Err(DbErr::Custom(
            "Song lyric update target not found, this should not happen"
                .to_string(),
        ))?;
    }

    Ok(())
}
