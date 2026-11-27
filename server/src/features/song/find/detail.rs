use std::collections::HashMap;

use domain::shared::{DateWithPrecision, Language};
use entity::enums::EntityType;
use entity::{song, song_lyrics};
use infra_db::SeaOrmRepository;
use itertools::Itertools;
use libfp::FunctorExt;
use rating_core::{RatingTarget, RatingTargetKind};
use sea_orm::{ConnectionTrait, EntityTrait, Select};
use song_lyrics_repo::SongLyrics;
use song_repo::read::{
    SongDetailRows, SongRelease, load_artist_credit_references,
    load_detail_rows, load_release_cover_art_urls,
    load_release_track_positions, load_snapshot_relations, load_song_relations,
    select_by_keyword,
};
use song_repo::{PendingSongHistory, load_pending_history};
use tokio::try_join;

use super::references::LanguageReferences;
use crate::features::song::model::{Song, SongDetail};
use crate::infra::database::cache::LANGUAGE_CACHE;
use crate::infra::database::error::{
    DatabaseError, DatabaseFailure, DatabaseResultExt,
};

#[cfg(all(test, feature = "integration-test"))]
#[path = "detail_tests.rs"]
mod integration_tests;

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

#[infra_db::observe("song.load_with_relations")]
async fn find_many_impl(
    select: Select<song::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Song>, DatabaseError> {
    let songs = load_detail_rows(select, db).await?;
    if songs.is_empty() {
        return Ok(vec![]);
    }

    let credit_keys = songs
        .iter()
        .flat_map(|song| &song.credits)
        .map(|credit| (credit.artist_id, credit.role_id))
        .collect::<Vec<_>>();
    let credit_references =
        load_artist_credit_references(&credit_keys, db).await?;
    let lang_cache = LANGUAGE_CACHE
        .get_or_init(db)
        .await
        .db_context("load language cache")?;
    let language_references =
        LanguageReferences::new(lang_cache.values().cloned());

    let song_release_ids: Vec<_> = songs
        .iter()
        .flat_map(|song| song.releases.iter().map(|r| r.id))
        .unique()
        .collect();

    let song_ids = songs.iter().map(|song| song.song.id).collect::<Vec<_>>();
    let (release_cover_art_urls, mut track_positions) = try_join!(
        load_release_cover_art_urls(&song_release_ids, db),
        load_release_track_positions(&song_ids, &song_release_ids, db),
    )?;

    Ok(songs
        .into_iter()
        .map(
            |SongDetailRows {
                 song: song_model,
                 artists,
                 credits,
                 languages,
                 localized_titles,
                 releases,
                 lyrics,
                 links,
             }| {
                let artists = artists.fmap_into();

                let releases = releases
                    .into_iter()
                    .unique_by(|release| release.id)
                    .map(|release| SongRelease {
                        id: release.id,
                        title: release.title,
                        release_date: DateWithPrecision::from_option(
                            release.release_date,
                            release.release_date_precision,
                        ),
                        track_positions: track_positions
                            .remove(&(song_model.id, release.id))
                            .unwrap_or_default(),
                        cover_art_url: release_cover_art_urls
                            .get(&release.id)
                            .cloned(),
                    })
                    .collect();

                let credits = credits
                    .into_iter()
                    .filter_map(|credit| {
                        credit_references
                            .credit(credit.artist_id, credit.role_id)
                    })
                    .collect();

                let languages = languages
                    .into_iter()
                    .filter_map(|lang| {
                        language_references.language(lang.language_id)
                    })
                    .collect();

                let localized_titles = localized_titles
                    .into_iter()
                    .filter_map(|title| {
                        language_references
                            .localized_title(title.language_id, title.title)
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
                    links: links.into_iter().map(|link| link.url).collect(),
                    releases,
                    relations: vec![],
                    lyrics,
                }
            },
        )
        .collect())
}

async fn load_pending_song_snapshot_impl(
    song: &mut Song,
    song_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DatabaseFailure> {
    let PendingSongHistory {
        title,
        artists,
        credits,
        languages,
        localized_titles,
        relations,
        links,
    } = load_pending_history(history_id, db).await?;

    let mut credit_keys = artists
        .iter()
        .map(|artist| (artist.artist_id, None))
        .collect::<Vec<_>>();
    credit_keys.extend(
        credits
            .iter()
            .map(|credit| (credit.artist_id, credit.role_id)),
    );
    let credit_references =
        load_artist_credit_references(&credit_keys, db).await?;
    let lang_cache = LANGUAGE_CACHE
        .get_or_init(db)
        .await
        .db_context("load language cache")?;
    let language_references =
        LanguageReferences::new(lang_cache.values().cloned());

    let snapshot_artists = artists
        .into_iter()
        .filter_map(|artist| credit_references.artist(artist.artist_id))
        .collect();
    let snapshot_credits = credits
        .into_iter()
        .filter_map(|credit| {
            credit_references.credit(credit.artist_id, credit.role_id)
        })
        .collect();
    let snapshot_languages = languages
        .into_iter()
        .filter_map(|language| {
            language_references.language(language.language_id)
        })
        .collect();
    let snapshot_localized_titles = localized_titles
        .into_iter()
        .filter_map(|title| {
            language_references.localized_title(title.language_id, title.title)
        })
        .collect();
    let snapshot_relations =
        load_snapshot_relations(song_id, relations, db).await?;

    song.title = title;
    song.artists = snapshot_artists;
    song.credits = snapshot_credits;
    song.languages = snapshot_languages;
    song.localized_titles = snapshot_localized_titles;
    song.links = links.into_iter().map(|link| link.url).collect();
    song.relations = snapshot_relations;

    Ok(())
}

#[infra_db::observe("song.load_pending_song_snapshot")]
fn load_pending_song_snapshot(
    song: &mut Song,
    song_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> impl std::future::Future<Output = Result<(), DatabaseError>> + Send {
    load_pending_song_snapshot_impl(song, song_id, history_id, db)
}

#[infra_db::observe("song.find_by_id")]
async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Song>, DatabaseError> {
    let select = song::Entity::find_by_id(id);
    let Some(mut song) = find_many_impl(select, &repo.conn).await?.pop() else {
        return Ok(None);
    };
    song.relations = load_song_relations(song.id, &repo.conn)
        .await
        .db_context("load song relations")?;
    Ok(Some(song))
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(super) enum DetailError {
    #[display("{_0}")]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    Rating(#[error(source)] rating_core::Error),
}

pub(super) async fn find_detail(
    repo: &SeaOrmRepository,
    id: i32,
    viewer_id: Option<i32>,
) -> Result<Option<SongDetail>, DetailError> {
    let Some(song) = find_by_id(repo, id).await? else {
        return Ok(None);
    };
    let rating = rating_core::get(
        &repo.conn,
        RatingTarget {
            kind: RatingTargetKind::Song,
            id,
        },
        viewer_id,
    )
    .await?;
    Ok(Some(SongDetail { song, rating }))
}

#[infra_db::observe("song.find_pending_correction")]
pub(super) async fn find_pending_correction(
    repo: &SeaOrmRepository,
    id: i32,
    correction_id: i32,
) -> Result<Option<Song>, DatabaseError> {
    let select = song::Entity::find_by_id(id);
    let Some(history_id) =
        crate::features::correction::find_pending_history_id(
            &repo.conn,
            id,
            EntityType::Song,
            correction_id,
        )
        .await?
    else {
        return Ok(None);
    };
    let Some(mut song) = find_many_impl(select, &repo.conn).await?.pop() else {
        return Ok(None);
    };
    load_pending_song_snapshot(&mut song, id, history_id, &repo.conn).await?;
    Ok(Some(song))
}

#[infra_db::observe("song.find_by_keyword")]
pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Song>, DatabaseError> {
    let items = find_many_impl(select_by_keyword(keyword), &repo.conn)
        .await
        .db_context("find songs by keyword")?;
    Ok(items)
}
