use std::collections::HashMap;

use entity::enums::StorageBackend;
use entity::sea_orm_active_enums::ReleaseImageType;
use entity::song::Column::{Id, Title};
use entity::{
    artist, image, release_image, song, song_artist, song_credit,
    song_language, song_localized_title, song_lyrics,
};
use itertools::{Itertools, izip};
use libfp::FunctorExt;
use sea_orm::{
    ColumnTrait, ConnectionTrait, DbErr, EntityTrait, JoinType, LoaderTrait,
    QueryFilter, QueryOrder, QuerySelect, RelationTrait, Select,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{ExprTrait, Func};
use tokio::try_join;

use super::filter::SongFilter;
use crate::domain::artist::SimpleArtist;
use crate::domain::credit_role::CreditRoleRef;
use crate::domain::image::Image;
use crate::domain::release::SimpleRelease;
use crate::domain::shared::Language;
use crate::domain::song::{LocalizedTitle, SongCredit};
use crate::domain::song_lyrics::SongLyrics;
use crate::features::song::model::Song;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::database::sea_orm::cache::LANGUAGE_CACHE;
use crate::infra::database::sea_orm::utils;
use crate::shared::http::{CorrectionSortField, SortDirection};

pub(super) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Song>, DbErr> {
    let select = song::Entity::find().filter(Id.eq(id));

    find_many_impl(select, &repo.conn)
        .await
        .map(|mut songs| songs.pop())
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Song>, DbErr> {
    let search_term = Func::lower(keyword);

    let select = song::Entity::find()
        .filter(
            Func::lower(Title.into_expr())
                .binary(Similarity, search_term.clone()),
        )
        .order_by_asc(
            Func::lower(Title.into_expr())
                .binary(SimilarityDistance, search_term),
        );

    find_many_impl(select, &repo.conn).await
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Song>, DbErr> {
    if let (Some(sort_field), Some(sort_direction)) =
        (filter.sort_field, filter.sort_direction)
    {
        return find_sorted_by_correction(
            repo,
            filter,
            sort_field,
            sort_direction,
            pagination,
        )
        .await;
    }

    let select: Select<song::Entity> = filter.into_select();
    utils::find_many_paginated(
        select,
        pagination,
        song::Column::Id,
        |select| find_many_impl(select, &repo.conn),
        |song: &Song| song.id,
    )
    .await
}

#[expect(clippy::too_many_lines)]
async fn find_many_impl(
    select: sea_orm::Select<song::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Song>, sea_orm::DbErr> {
    let songs = select.all(db).await?;
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
    ) = try_join!(
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

    let (song_credits_artist_ids, song_credits_role_ids): (Vec<_>, Vec<_>) =
        song_credits_list
            .iter()
            .flat_map(|credits| {
                credits.iter().map(|c| (c.artist_id, c.role_id))
            })
            .unzip();

    let (song_credits_artist_map, credit_roles_map, lang_cache) = try_join!(
        load_credit_artists(&song_credits_artist_ids, db),
        load_credit_roles(&song_credits_role_ids, db),
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
            song_model,
            song_artists,
            song_credits,
            song_languages,
            localized_titles,
            song_releases,
            lyrics,
        )| {
            let artists = song_artists.fmap_into();

            let releases = song_releases
                .into_iter()
                .map(|release| SimpleRelease {
                    id: release.id,
                    title: release.title,
                    cover_art_url: release_cover_art_urls
                        .get(&release.id)
                        .cloned(),
                })
                .collect();

            let credits = build_song_credits(
                song_credits,
                &song_credits_artist_map,
                &credit_roles_map,
            );

            let languages = song_languages
                .into_iter()
                .filter_map(|lang| lang_cache.get(&lang.language_id))
                .cloned()
                .collect();

            let localized_titles = localized_titles
                .into_iter()
                .filter_map(|title| try {
                    LocalizedTitle {
                        language: lang_cache
                            .get(&title.language_id)
                            .cloned()?,
                        title: title.title,
                    }
                })
                .collect();

            let lyrics = build_song_lyrics(lyrics, lang_cache);

            Song {
                id: song_model.id,
                title: song_model.title,
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
    role_ids: &[Option<i32>],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, CreditRoleRef>, sea_orm::DbErr> {
    use entity::credit_role;

    if role_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let roles = credit_role::Entity::find()
        .filter(
            credit_role::Column::Id
                .is_in(role_ids.iter().flatten().unique().copied()),
        )
        .all(db)
        .await?;

    Ok(roles
        .into_iter()
        .map(|role| {
            (
                role.id,
                CreditRoleRef {
                    id: role.id,
                    name: role.name,
                },
            )
        })
        .collect())
}

async fn load_release_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, sea_orm::DbErr> {
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
) -> Result<HashMap<i32, SimpleArtist>, sea_orm::DbErr> {
    if artist_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let artists = artist::Entity::find()
        .filter(artist::Column::Id.is_in(artist_ids.iter().copied()))
        .all(db)
        .await?;

    Ok(artists
        .into_iter()
        .map(|artist| (artist.id, artist.into()))
        .collect())
}

fn build_song_credits(
    credits: Vec<song_credit::Model>,
    artist_map: &HashMap<i32, SimpleArtist>,
    role_map: &HashMap<i32, CreditRoleRef>,
) -> Vec<SongCredit> {
    credits
        .into_iter()
        .filter_map(|credit| {
            let artist = artist_map.get(&credit.artist_id).cloned()?;
            let role = credit
                .role_id
                .and_then(|role_id| role_map.get(&role_id).cloned());

            Some(SongCredit { artist, role })
        })
        .collect()
}

fn build_song_lyrics(
    lyrics: Vec<song_lyrics::Model>,
    lang_cache: &HashMap<i32, Language>,
) -> Vec<SongLyrics> {
    lyrics
        .into_iter()
        .map(|lyric| {
            let language = lang_cache
                .get(&lyric.language_id)
                .cloned()
                .expect("Language should be found in cache");

            SongLyrics {
                id: lyric.id,
                song_id: lyric.song_id,
                content: lyric.content,
                is_main: lyric.is_main,
                language,
            }
        })
        .collect()
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: crate::shared::http::PaginationQuery,
) -> Result<crate::domain::shared::Paginated<Song>, DbErr> {
    use entity::enums::EntityType;

    let entity_ids =
        crate::infra::database::sea_orm::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Song,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await?;

    if entity_ids.is_empty() {
        return Ok(crate::domain::shared::Paginated::nothing());
    }

    let select = filter
        .into_select()
        .filter(song::Column::Id.is_in(entity_ids.clone()));

    let mut songs = find_many_impl(select, &repo.conn).await?;

    songs = crate::infra::database::sea_orm::utils::sort_by_id_list(
        songs,
        &entity_ids,
        |song| song.id,
    );

    Ok(utils::paginate_by_id(songs, &pagination, |song| song.id))
}

#[cfg(test)]
mod tests {
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
