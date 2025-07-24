use std::collections::HashMap;

use entity::{correction_revision, song_lyrics, song_lyrics_history};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DbErr, EntityTrait,
    ModelTrait, QueryFilter, QueryOrder, QueryTrait,
};

use super::SeaOrmTxRepo;
use super::cache::LANGUAGE_CACHE;
use crate::domain::repository::Connection;
use crate::domain::shared::model::Language;
use crate::domain::song_lyrics::model::{NewSongLyrics, SongLyrics};
use crate::domain::song_lyrics::repo::{
    FindManyFilter, FindOneFilter, Repo, TxRepo,
};

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_one(
        &self,
        filter: FindOneFilter,
    ) -> Result<Option<SongLyrics>, Self::Error> {
        let filter = match filter {
            FindOneFilter::Id { id } => song_lyrics::Column::Id.eq(id),
            FindOneFilter::SongAndLang {
                song_id,
                language_id,
            } => song_lyrics::Column::SongId
                .eq(song_id)
                .and(song_lyrics::Column::LanguageId.eq(language_id)),
        };

        let query = song_lyrics::Entity::find().filter(filter);

        let model = query.one(self.conn()).await?;

        if let Some(model) = model {
            let lang_cache = LANGUAGE_CACHE.get_or_init(self.conn()).await?;

            Ok(Some(SongLyrics::from_model_and_cache(model, lang_cache)))
        } else {
            Ok(None)
        }
    }

    async fn find_many(
        &self,
        filter: FindManyFilter,
    ) -> Result<Vec<SongLyrics>, Self::Error> {
        let filter = match filter {
            FindManyFilter::Song { song_id } => {
                song_lyrics::Column::SongId.eq(song_id)
            }
            FindManyFilter::Language { language_id } => {
                song_lyrics::Column::LanguageId.eq(language_id)
            }
            // TODO: validate len
            FindManyFilter::Songs { song_ids } => {
                song_lyrics::Column::SongId.is_in(song_ids)
            }
        };
        let query = song_lyrics::Entity::find().filter(filter);

        let models = query.all(self.conn()).await?;

        if models.is_empty() {
            return Ok(vec![]);
        }

        let lang_cache = LANGUAGE_CACHE.get_or_init(self.conn()).await?;

        Ok(models
            .into_iter()
            .map(|m| SongLyrics::from_model_and_cache(m, lang_cache))
            .collect())
    }
}

impl TxRepo for SeaOrmTxRepo {
    async fn create(&self, lyrics: &NewSongLyrics) -> Result<i32, Self::Error> {
        create_lyrics_impl(lyrics, self.conn()).await
    }

    async fn create_history(
        &self,
        lyrics: &NewSongLyrics,
    ) -> Result<i32, Self::Error> {
        create_history_impl(lyrics, self.conn()).await
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
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

impl SongLyrics {
    pub(super) fn from_model_and_cache(
        model: song_lyrics::Model,
        lang_cache: &HashMap<i32, Language>,
    ) -> Self {
        let language = lang_cache
            .get(&model.language_id)
            .cloned()
            .expect("Language should be found in cache");

        Self {
            id: model.id,
            song_id: model.song_id,
            content: model.content,
            is_main: model.is_main,
            language,
        }
    }
}
