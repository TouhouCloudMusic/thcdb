use std::collections::HashMap;

use domain::shared::Language;
use entity::song_lyrics;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{ColumnTrait, ConnectionTrait, DbErr, EntityTrait, QueryFilter};
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct SongLyrics {
    pub id: i32,
    pub song_id: i32,
    pub content: String,
    pub is_main: bool,
    pub language: Language,
}

#[derive(Clone, Debug)]
pub enum FindOneFilter {
    Id { id: i32 },
    SongAndLang { song_id: i32, language_id: i32 },
}

#[derive(Clone, Debug)]
pub enum FindManyFilter {
    Song { song_id: i32 },
    Language { language_id: i32 },
    Songs { song_ids: Vec<i32> },
}

fn map_song_lyrics(
    model: song_lyrics::Model,
    lang_cache: &HashMap<i32, Language>,
) -> SongLyrics {
    let language = lang_cache
        .get(&model.language_id)
        .cloned()
        .expect("Language should be found in cache");

    SongLyrics {
        id: model.id,
        song_id: model.song_id,
        content: model.content,
        is_main: model.is_main,
        language,
    }
}

/// Loads the caller's language cache only when a lyrics row is found.
#[infra_db::observe("song_lyrics.find_one")]
pub async fn find_one<'a, F>(
    db: &impl ConnectionTrait,
    filter: FindOneFilter,
    load_languages: impl FnOnce() -> F,
) -> Result<Option<SongLyrics>, DatabaseError>
where
    F: Future<Output = Result<&'a HashMap<i32, Language>, DbErr>>,
{
    let condition = match filter {
        FindOneFilter::Id { id } => song_lyrics::Column::Id.eq(id),
        FindOneFilter::SongAndLang {
            song_id,
            language_id,
        } => song_lyrics::Column::SongId
            .eq(song_id)
            .and(song_lyrics::Column::LanguageId.eq(language_id)),
    };

    let model = song_lyrics::Entity::find()
        .filter(condition)
        .one(db)
        .await
        .db_context("load song lyrics")?;

    if let Some(model) = model {
        let lang_cache = load_languages()
            .await
            .db_context("load languages for song lyrics")?;
        Ok(Some(map_song_lyrics(model, lang_cache)))
    } else {
        Ok(None)
    }
}

/// Loads the caller's language cache only when the result is nonempty.
#[infra_db::observe("song_lyrics.find_many")]
pub async fn find_many<'a, F>(
    db: &impl ConnectionTrait,
    filter: FindManyFilter,
    load_languages: impl FnOnce() -> F,
) -> Result<Vec<SongLyrics>, DatabaseError>
where
    F: Future<Output = Result<&'a HashMap<i32, Language>, DbErr>>,
{
    let condition = match filter {
        FindManyFilter::Song { song_id } => {
            song_lyrics::Column::SongId.eq(song_id)
        }
        FindManyFilter::Language { language_id } => {
            song_lyrics::Column::LanguageId.eq(language_id)
        }
        FindManyFilter::Songs { song_ids } => {
            song_lyrics::Column::SongId.is_in(song_ids)
        }
    };

    let models = song_lyrics::Entity::find()
        .filter(condition)
        .all(db)
        .await
        .db_context("load song lyrics list")?;

    if models.is_empty() {
        return Ok(vec![]);
    }

    let lang_cache = load_languages()
        .await
        .db_context("load languages for song lyrics")?;

    Ok(models
        .into_iter()
        .map(|model| map_song_lyrics(model, lang_cache))
        .collect())
}
