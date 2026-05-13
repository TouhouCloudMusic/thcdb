use entity::{correction_revision, song_lyrics, song_lyrics_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder, QueryTrait,
};

use super::{ApplyCorrectionError, SeaOrmTxRepo};
use crate::domain::song_lyrics::NewSongLyrics;
use crate::features::song_lyrics::TxRepo;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::error::BrokenEntityReference;

impl TxRepo for SeaOrmTxRepo {
    async fn create(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, DatabaseError> {
        create_lyrics_impl(lyrics, self.conn())
            .await
            .db_operation("create song lyrics")
    }

    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, DatabaseError> {
        create_history_impl(lyrics, self.conn())
            .await
            .db_operation("create song lyrics history")
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), ApplyCorrectionError> {
        apply_update_impl(correction, self.conn()).await
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
pub(crate) async fn create_lyrics_impl(
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
pub(crate) async fn create_history_impl(
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
pub(crate) async fn apply_update_impl(
    correction: entity::correction::Model,
    conn: &impl ConnectionTrait,
) -> Result<(), ApplyCorrectionError> {
    // Find the latest correction revision
    let revision = correction
        .find_related(correction_revision::Entity)
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(conn)
        .await?
        .ok_or(BrokenEntityReference {
            entity: "correction revision",
            id: correction.id,
        })?;

    // Find the history record
    let history =
        song_lyrics_history::Entity::find_by_id(revision.entity_history_id)
            .one(conn)
            .await?
            .ok_or(BrokenEntityReference {
                entity: "song lyrics history",
                id: revision.entity_history_id,
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
        Err(BrokenEntityReference {
            entity: "song lyrics",
            id: correction.entity_id,
        })?;
    }

    Ok(())
}
