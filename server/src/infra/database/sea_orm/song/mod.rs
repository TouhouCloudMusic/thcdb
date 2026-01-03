use entity::{
    song, song_artist, song_artist_history, song_credit, song_credit_history,
    song_history, song_language, song_language_history, song_localized_title,
    song_localized_title_history,
};
use impls::apply_update;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, DatabaseTransaction, DbErr, EntityTrait, IntoActiveValue,
};
use snafu::ResultExt;

use crate::domain::shared::NewLocalizedName;
use crate::domain::song::{NewSong, NewSongCredit, TxRepo};

pub(crate) mod impls;

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
    async fn create(
        &self,
        data: &NewSong,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        let song = create_song_and_relations(data, self.conn()).await?;

        Ok(song.id)
    }

    async fn create_history(
        &self,
        data: &NewSong,
    ) -> Result<i32, Box<dyn std::error::Error + Send + Sync>> {
        create_song_history_and_relations(data, self.conn())
            .await
            .map(|x| x.id)
            .boxed()
    }

    async fn apply_update(
        &self,
        correction: entity::correction::Model,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        apply_update(correction, self.conn()).await.boxed()
    }
}

pub(crate) async fn create_song_and_relations(
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song::Model, DbErr> {
    let song_model = song::ActiveModel {
        id: NotSet,
        title: data.title.to_string().into_active_value(),
    };

    let song = song_model.insert(tx).await?;

    // artists
    if let Some(artists) = &data.artists {
        create_artists(song.id, artists, tx).await?;
    }

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

pub(crate) async fn create_song_history_and_relations(
    data: &NewSong,
    tx: &DatabaseTransaction,
) -> Result<song_history::Model, DbErr> {
    let history_model = song_history::ActiveModel {
        id: NotSet,
        title: data.title.to_string().into_active_value(),
    };

    let history = history_model.insert(tx).await?;

    // artists history
    if let Some(artists) = &data.artists {
        create_artist_histories(history.id, artists, tx).await?;
    }

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

async fn create_artists(
    song_id: i32,
    artists: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
    artists: &[i32],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
    credits: &[NewSongCredit],
    tx: &DatabaseTransaction,
) -> Result<(), DbErr> {
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
