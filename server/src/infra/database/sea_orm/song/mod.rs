use std::collections::HashMap;

use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::ReleaseImageType;
use entity::{
    artist, image, release_image, song, song_artist, song_credit,
    song_credit_history, song_history, song_language, song_language_history,
    song_localized_title, song_localized_title_history, song_lyrics,
};
use impls::apply_update;
use itertools::{Itertools, izip};
use libfp::FunctorExt;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::sea_query::IntoCondition;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseTransaction, DbErr,
    EntityTrait, IntoActiveValue, JoinType, LoaderTrait, QueryFilter,
    QuerySelect, RelationTrait, Select,
};

use super::cache::LANGUAGE_CACHE;
use crate::domain::artist::model::SimpleArtist;
use crate::domain::image::Image;
use crate::domain::release::model::SimpleRelease;
use crate::domain::repository::Connection;
use crate::domain::shared::model::{CreditRole, Language, NewLocalizedName};
use crate::domain::song::model::{
    LocalizedTitle, NewSong, NewSongCredit, Song, SongCredit,
};
use crate::domain::song::repo::{Repo, TxRepo};
use crate::domain::song_lyrics::model::SongLyrics;

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

#[expect(clippy::too_many_lines)]
async fn find_many_impl(
    cond: impl IntoCondition,
    db: &impl ConnectionTrait,
) -> Result<Vec<Song>, DbErr> {
    let songs = song::Entity::find().filter(cond).all(db).await?;
    if songs.is_empty() {
        return Ok(vec![]);
    }

    let (
        song_artists_list,
        song_credits_list,
        song_langs_list,
        localized_titles_list,
        song_releases_list,
        song_lyrics_list,
    ) = tokio::try_join!(
        songs.load_many_to_many(artist::Entity, song_artist::Entity, db),
        songs.load_many(song_credit::Entity, db),
        songs.load_many(song_language::Entity::find(), db),
        songs.load_many(song_localized_title::Entity, db),
        songs.load_many_to_many(
            entity::release::Entity,
            entity::release_track::Entity,
            db,
        ),
        songs.load_many(song_lyrics::Entity, db),
    )?;

    let (song_credits_artists_ids, song_credits_roles_ids): (Vec<_>, Vec<_>) =
        song_credits_list
            .iter()
            .flat_map(|credits| {
                credits.iter().map(|c| (c.artist_id, c.role_id))
            })
            .unzip();

    let (song_credits_artist_map, credit_roles_map, lang_cache) = tokio::try_join!(
        load_credit_artists(&song_credits_artists_ids, db),
        load_credit_roles(&song_credits_roles_ids, db),
        LANGUAGE_CACHE.get_or_init(db),
    )?;

    let song_release_ids: Vec<_> = song_releases_list
        .iter()
        .flat_map(|releases| releases.iter().map(|r| r.id))
        .unique()
        .collect();

    let release_cover_art_urls =
        load_release_cover_art_urls(&song_release_ids, db).await?;

    Ok(izip!(
        songs,
        song_artists_list,
        song_credits_list,
        song_langs_list,
        localized_titles_list,
        song_releases_list,
        song_lyrics_list,
    )
    .map(
        |(
            s_model,
            s_artists,
            s_credits,
            s_langs,
            s_titles,
            s_releases,
            s_lyrics,
        )| {
            let artists = s_artists.fmap_into();

            let releases = s_releases
                .into_iter()
                .map(|r| SimpleRelease {
                    id: r.id,
                    title: r.title,
                    cover_art_url: release_cover_art_urls.get(&r.id).cloned(),
                })
                .collect();

            let credits = build_song_credits(
                s_credits,
                &song_credits_artist_map,
                &credit_roles_map,
            );

            let languages = s_langs
                .into_iter()
                .filter_map(|l| lang_cache.get(&l.language_id))
                .cloned()
                .collect();

            let localized_titles = s_titles
                .into_iter()
                .filter_map(|t| try {
                    LocalizedTitle {
                        language: lang_cache.get(&t.language_id).cloned()?,
                        title: t.title,
                    }
                })
                .collect();

            let lyrics = build_song_lyrics(s_lyrics, lang_cache);

            Song {
                id: s_model.id,
                title: s_model.title,
                artists,
                credits,
                languages,
                localized_titles,
                releases,
                lyrics,
            }
        },
    )
    .collect())
}

async fn load_credit_roles(
    role_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, CreditRole>, DbErr> {
    use entity::credit_role;

    if role_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let roles = credit_role::Entity::find()
        .filter(credit_role::Column::Id.is_in(role_ids.iter().copied()))
        .all(db)
        .await?;

    Ok(roles
        .into_iter()
        .map(|r| {
            (
                r.id,
                CreditRole {
                    id: r.id,
                    name: r.name,
                },
            )
        })
        .collect())
}

async fn load_release_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, DbErr> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let cover_art_urls_map = load_release_cover_art_urls_query(release_ids)
        .into_tuple::<(i32, String, String, StorageBackend)>()
        .all(db)
        .await?
        .into_iter()
        .map(|(release_id, directory, filename, backend)| {
            (
                release_id,
                Image::format_url(backend, &directory, &filename),
            )
        })
        .collect::<HashMap<i32, String>>();

    Ok(cover_art_urls_map)
}

fn load_release_cover_art_urls_query(
    release_ids: &[i32],
) -> Select<release_image::Entity> {
    release_image::Entity::find()
        .select_only()
        .column(release_image::Column::ReleaseId)
        .column(image::Column::Directory)
        .column(image::Column::Filename)
        .column(image::Column::Backend)
        .join(JoinType::InnerJoin, release_image::Relation::Image.def())
        .filter(
            release_image::Column::ReleaseId.is_in(release_ids.iter().copied()),
        )
        .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
}

async fn load_credit_artists(
    artist_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, SimpleArtist>, DbErr> {
    if artist_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let artists = artist::Entity::find()
        .filter(artist::Column::Id.is_in(artist_ids.iter().copied()))
        .all(db)
        .await?;

    Ok(artists.into_iter().map(|a| (a.id, a.into())).collect())
}

fn build_song_credits(
    credits: Vec<song_credit::Model>,
    artist_map: &HashMap<i32, SimpleArtist>,
    role_map: &HashMap<i32, CreditRole>,
) -> Vec<SongCredit> {
    credits
        .into_iter()
        .filter_map(|c| {
            artist_map
                .get(&c.artist_id)
                .cloned()
                .zip(role_map.get(&c.role_id).cloned())
                .map(|(artist, role)| SongCredit { artist, role })
        })
        .collect()
}

fn build_song_lyrics(
    lyrics: Vec<song_lyrics::Model>,
    lang_cache: &HashMap<i32, Language>,
) -> Vec<SongLyrics> {
    lyrics
        .into_iter()
        .map(|l| SongLyrics::from_model_and_cache(l, lang_cache))
        .collect()
}

impl TxRepo for crate::infra::database::sea_orm::SeaOrmTxRepo {
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

#[cfg(test)]
mod test {
    use sea_orm::QueryTrait;

    use super::*;
    #[test]
    fn test_load_release_cover_art_urls_query() {
        let query = load_release_cover_art_urls_query(&[1, 2, 3, 3]);
        assert_eq!(
            query.build(sea_orm::DatabaseBackend::Postgres).to_string(),
            r#"SELECT "release_image"."release_id", "image"."directory", "image"."filename", CAST("image"."backend" AS "text") FROM "release_image" INNER JOIN "image" ON "release_image"."image_id" = "image"."id" WHERE "release_image"."release_id" IN (1, 2, 3, 3) AND "release_image"."type" = (CAST('Cover' AS "release_image_type"))"#,
        );
    }
}
