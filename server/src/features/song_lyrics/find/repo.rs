use std::collections::HashMap;

use entity::song_lyrics;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::domain::shared::Language;
use crate::features::song_lyrics::model::SongLyrics;
use crate::infra::database::sea_orm::SeaOrmRepository;

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
use crate::infra::database::sea_orm::cache::LANGUAGE_CACHE;

pub(super) async fn find_one(
    repo: &SeaOrmRepository,
    filter: FindOneFilter,
) -> Result<Option<SongLyrics>, sea_orm::DbErr>
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
        .one(&repo.conn)
        .await?;

    if let Some(model) = model {
        let lang_cache = LANGUAGE_CACHE.get_or_init(&repo.conn).await?;
        Ok(Some(map_song_lyrics(model, lang_cache)))
    } else {
        Ok(None)
    }
}

pub(super) async fn find_many(
    repo: &SeaOrmRepository,
    filter: FindManyFilter,
) -> Result<Vec<SongLyrics>, sea_orm::DbErr>
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
        .all(&repo.conn)
        .await?;

    if models.is_empty() {
        return Ok(vec![]);
    }

    let lang_cache = LANGUAGE_CACHE.get_or_init(&repo.conn).await?;

    Ok(models
        .into_iter()
        .map(|model| map_song_lyrics(model, lang_cache))
        .collect())
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
