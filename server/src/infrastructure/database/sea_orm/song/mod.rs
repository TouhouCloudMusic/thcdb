use entity::{
    language, song, song_credit, song_credit_history, song_history,
    song_language, song_language_history, song_localized_title,
    song_localized_title_history,
};
use impls::apply_update;
use itertools::{Itertools, izip};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveValue, LoaderTrait, QueryFilter,
};

use crate::domain::repository::Connection;
use crate::domain::share::model::{Language, NewLocalizedName};
use crate::domain::song::model::{
    LocalizedTitle, NewSong, NewSongCredit, Song, SongCredit,
};
use crate::domain::song::repo::{Repo, TxRepo};

mod impls;

impl<T> Repo for T
where
    T: Connection<Error = DbErr>,
    T::Conn: ConnectionTrait,
{
    async fn find_by_id(&self, id: i32) -> Result<Option<Song>, Self::Error> {
        find_many_impl(song::Column::Id.eq(id), self.conn())
            .await
            .map(|x| x.into_iter().next())
    }

    async fn find_by_keyword(
        &self,
        keyword: &str,
    ) -> Result<Vec<Song>, Self::Error> {
        find_many_impl(song::Column::Title.contains(keyword), self.conn()).await
    }
}

async fn find_many_impl(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<Song>, DbErr> {
    let songs = song::Entity::find().filter(cond).all(db).await?;

    let credits = songs.load_many(song_credit::Entity, db).await?;

    let langs = songs
        .load_many_to_many(language::Entity, song_language::Entity, db)
        .await?;

    let localized_titles =
        songs.load_many(song_localized_title::Entity, db).await?;

    let language_ids = localized_titles
        .iter()
        .flat_map(|titles| titles.iter().map(|title| title.language_id))
        .collect::<Vec<_>>();

    let languages = if language_ids.is_empty() {
        vec![]
    } else {
        language::Entity::find()
            .filter(language::Column::Id.is_in(language_ids))
            .all(db)
            .await?
    };

    Ok(izip!(songs, credits, langs, localized_titles)
        .map(|(s, credits, langs, titles)| Song {
            id: s.id,
            title: s.title,
            credits: credits
                .into_iter()
                .map(|c| SongCredit {
                    artist_id: c.artist_id,
                    role_id: c.role_id,
                })
                .collect(),
            languages: langs
                .into_iter()
                .map(|l| Language {
                    id: l.id,
                    name: l.name,
                    code: l.code,
                })
                .collect(),
            localized_titles: titles
                .into_iter()
                .map(|t| {
                    let language = languages
                        .iter()
                        .find(|l| l.id == t.language_id)
                        .unwrap()
                        .clone();
                    LocalizedTitle {
                        language: Language {
                            id: language.id,
                            name: language.name,
                            code: language.code,
                        },
                        title: t.title,
                    }
                })
                .collect(),
        })
        .collect_vec())
}

impl TxRepo for crate::infrastructure::database::sea_orm::SeaOrmTxRepo {
    async fn create(&self, data: &NewSong) -> Result<i32, Self::Error> {
        let song = create_song_and_relations(data, self.conn()).await?;

        Ok(song.id)
    }

    async fn create_history(&self, data: &NewSong) -> Result<i32, Self::Error> {
        create_song_history_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Self::Error> {
        apply_update(correction, self.conn()).await
    }
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

    if let Some(credits) = &data.credits {
        create_credits(song.id, credits, tx).await?;
    }

    if let Some(languages) = &data.languages {
        create_languages(song.id, languages, tx).await?;
    }

    if let Some(localized_titles) = &data.localized_titles {
        create_localized_titles(song.id, localized_titles, tx).await?;
    }

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

    if let Some(credits) = &data.credits {
        create_credit_histories(history.id, credits, tx).await?;
    }

    if let Some(languages) = &data.languages {
        create_language_histories(history.id, languages, tx).await?;
    }

    if let Some(localized_titles) = &data.localized_titles {
        create_localized_title_histories(history.id, localized_titles, tx)
            .await?;
    }

    Ok(history)
}

async fn create_credits(
    song_id: i32,
    credits: &[NewSongCredit],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let models = credits.iter().map(|credit| song_credit::ActiveModel {
        artist_id: Set(credit.artist_id),
        song_id: Set(song_id),
        role_id: Set(credit.role_id),
    });

    song_credit::Entity::insert_many(models).exec(tx).await?;

    Ok(())
}

async fn create_credit_histories(
    history_id: i32,
    credits: &[NewSongCredit],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
    if credits.is_empty() {
        return Ok(());
    }

    let models =
        credits
            .iter()
            .map(|credit| song_credit_history::ActiveModel {
                artist_id: Set(credit.artist_id),
                history_id: Set(history_id),
                role_id: Set(credit.role_id),
            });

    song_credit_history::Entity::insert_many(models)
        .exec(tx)
        .await?;

    Ok(())
}

async fn create_languages(
    song_id: i32,
    languages: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
    languages: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
    localized_titles: &[NewLocalizedName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
    localized_titles: &[NewLocalizedName],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
