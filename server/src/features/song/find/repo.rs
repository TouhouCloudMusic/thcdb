use std::collections::HashMap;

use domain::shared::{
    DatePrecision, DateWithPrecision, Language, SimpleArtist,
};
use entity::enums::EntityType;
use entity::sea_orm_active_enums::ReleaseImageType;
use entity::song::Column::{Id, Title};
use entity::{
    artist, image, release, release_disc, release_image, release_track, song,
    song_artist, song_artist_history, song_credit, song_credit_history,
    song_history, song_language, song_language_history, song_link,
    song_link_history, song_localized_title, song_localized_title_history,
    song_lyrics, song_relation, song_relation_history,
};
use infra_db::SeaOrmRepository;
use itertools::{Itertools, izip};
use libfp::FunctorExt;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, FromQueryResult, JoinType,
    LoaderTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect,
    RelationTrait, Select,
};
use sea_query::extension::postgres::PgBinOper::{
    Similarity, SimilarityDistance,
};
use sea_query::{ExprTrait, Func, NullOrdering};
use tokio::try_join;

use super::filter::SongFilter;
use super::references::{LanguageReferences, load_artist_credit_references};
use crate::features::song::list::{self, SongListing};
use crate::features::song::model::{
    ReleaseTrackPosition, Song, SongRelation, SongRelationDirection,
    SongRelationSummary, SongRelease,
};
use crate::features::song_lyrics::model::SongLyrics;
use crate::infra::database::cache::LANGUAGE_CACHE;
use crate::infra::database::error::{
    BrokenEntityReference, DatabaseError, DatabaseResultExt,
};
use crate::infra::database::utils;
use crate::shared::http::{CorrectionSortField, SortDirection};

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

pub(in crate::features::song) async fn find_by_id(
    repo: &SeaOrmRepository,
    id: i32,
) -> Result<Option<Song>, DatabaseError> {
    let select = song::Entity::find().filter(Id.eq(id));
    let Some(mut song) = find_many_impl(select, &repo.conn).await?.pop() else {
        return Ok(None);
    };
    song.relations = load_song_relations(song.id, &repo.conn)
        .await
        .db_operation("load song relations")?;
    Ok(Some(song))
}

pub(super) async fn find_pending_correction(
    repo: &SeaOrmRepository,
    id: i32,
    correction_id: i32,
) -> Result<Option<Song>, DatabaseError> {
    let select = song::Entity::find().filter(Id.eq(id));
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

async fn load_pending_song_snapshot(
    song: &mut Song,
    song_id: i32,
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), DatabaseError> {
    let history = song_history::Entity::find_by_id(history_id)
        .one(db)
        .await
        .db_operation("find pending song history")?
        .ok_or(BrokenEntityReference {
            entity: "song history",
            id: history_id,
        })?;

    let SongHistoryAssociations {
        artists,
        credits,
        languages,
        localized_titles,
        relations,
        links,
    } = load_song_history_associations(history.id, db).await?;

    let mut credit_keys = artists
        .iter()
        .map(|artist| (artist.artist_id, None))
        .collect::<Vec<_>>();
    credit_keys.extend(
        credits
            .iter()
            .map(|credit| (credit.artist_id, credit.role_id)),
    );
    let credit_references = load_artist_credit_references(&credit_keys, db)
        .await
        .map_err(DatabaseError::from)?;
    let lang_cache = LANGUAGE_CACHE
        .get_or_init(db)
        .await
        .db_operation("load language cache")?;
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

    song.title = history.title;
    song.artists = snapshot_artists;
    song.credits = snapshot_credits;
    song.languages = snapshot_languages;
    song.localized_titles = snapshot_localized_titles;
    song.links = links.into_iter().map(|link| link.url).collect();
    song.relations = snapshot_relations;

    Ok(())
}

struct SongHistoryAssociations {
    artists: Vec<song_artist_history::Model>,
    credits: Vec<song_credit_history::Model>,
    languages: Vec<song_language_history::Model>,
    localized_titles: Vec<song_localized_title_history::Model>,
    relations: Vec<song_relation_history::Model>,
    links: Vec<song_link_history::Model>,
}

async fn load_song_history_associations(
    history_id: i32,
    db: &impl ConnectionTrait,
) -> Result<SongHistoryAssociations, DatabaseError> {
    let (artists, credits, languages, localized_titles, relations, links) =
        tokio::try_join!(
            song_artist_history::Entity::find()
                .filter(song_artist_history::Column::HistoryId.eq(history_id))
                .order_by_asc(song_artist_history::Column::ArtistId)
                .all(db),
            song_credit_history::Entity::find()
                .filter(song_credit_history::Column::HistoryId.eq(history_id))
                .order_by_asc(song_credit_history::Column::Id)
                .all(db),
            song_language_history::Entity::find()
                .filter(song_language_history::Column::HistoryId.eq(history_id))
                .order_by_asc(song_language_history::Column::LanguageId)
                .all(db),
            song_localized_title_history::Entity::find()
                .filter(
                    song_localized_title_history::Column::HistoryId
                        .eq(history_id),
                )
                .order_by_asc(song_localized_title_history::Column::Id)
                .all(db),
            song_relation_history::Entity::find()
                .filter(song_relation_history::Column::HistoryId.eq(history_id))
                .order_by_asc(song_relation_history::Column::SourceId)
                .order_by_asc(song_relation_history::Column::DerivedId)
                .order_by_asc(song_relation_history::Column::RelationType)
                .all(db),
            song_link_history::Entity::find()
                .filter(song_link_history::Column::HistoryId.eq(history_id))
                .order_by_asc(song_link_history::Column::Id)
                .all(db),
        )
        .db_operation("load pending song history associations")?;

    Ok(SongHistoryAssociations {
        artists,
        credits,
        languages,
        localized_titles,
        relations,
        links,
    })
}

async fn load_snapshot_relations(
    song_id: i32,
    relations: Vec<song_relation_history::Model>,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongRelation>, DatabaseError> {
    if relations.is_empty() {
        return Ok(vec![]);
    }

    let related_song_ids = relations
        .iter()
        .filter_map(|relation| {
            if relation.source_id == song_id {
                Some(relation.derived_id)
            } else if relation.derived_id == song_id {
                Some(relation.source_id)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();
    if related_song_ids.is_empty() {
        return Ok(vec![]);
    }

    let related_song_map =
        load_relation_summaries(&related_song_ids, db).await?;
    Ok(relations
        .into_iter()
        .filter_map(|relation| {
            let (related_song_id, direction) = if relation.source_id == song_id
            {
                (relation.derived_id, SongRelationDirection::Source)
            } else if relation.derived_id == song_id {
                (relation.source_id, SongRelationDirection::Derived)
            } else {
                return None;
            };
            let song = related_song_map.get(&related_song_id).cloned()?;
            Some(SongRelation {
                song,
                direction,
                r#type: relation.relation_type,
                description: relation.description,
            })
        })
        .collect())
}

pub(crate) async fn exists(
    db: &impl sea_orm::ConnectionTrait,
    id: i32,
) -> Result<bool, DatabaseError> {
    song::Entity::find_by_id(id)
        .exists(db)
        .await
        .db_operation("check song existence")
}

pub(super) async fn find_by_keyword(
    repo: &SeaOrmRepository,
    keyword: &str,
) -> Result<Vec<Song>, DatabaseError> {
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

    find_many_impl(select, &repo.conn)
        .await
        .db_operation("find songs by keyword")
}

pub(super) async fn find_by_filter(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<SongListing>, DatabaseError> {
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
        .await
        .db_operation("explore songs");
    }

    let select: Select<song::Entity> = filter.into_select();
    utils::find_many_page(
        &repo.conn,
        select,
        pagination,
        song::Column::Id,
        |select| list::load(select, &repo.conn),
    )
    .await
    .db_operation("explore songs")
}

#[expect(clippy::too_many_lines)]
async fn find_many_impl(
    select: sea_orm::Select<song::Entity>,
    db: &impl ConnectionTrait,
) -> Result<Vec<Song>, DatabaseError> {
    let songs = select.all(db).await.db_operation("load songs")?;
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
        song_links_list,
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
        songs.load_one(song_lyrics::Entity, db),
        songs.load_many(song_link::Entity, db),
    )
    .db_operation("load song associations")?;

    let credit_keys = song_credits_list
        .iter()
        .flatten()
        .map(|credit| (credit.artist_id, credit.role_id))
        .collect::<Vec<_>>();
    let credit_references = load_artist_credit_references(&credit_keys, db)
        .await
        .map_err(DatabaseError::from)?;
    let lang_cache = LANGUAGE_CACHE
        .get_or_init(db)
        .await
        .db_operation("load language cache")?;
    let language_references =
        LanguageReferences::new(lang_cache.values().cloned());

    let song_release_ids: Vec<_> = song_releases_list
        .iter()
        .flat_map(|releases| releases.iter().map(|r| r.id))
        .unique()
        .collect();

    let song_ids = songs.iter().map(|song| song.id).collect::<Vec<_>>();
    let (release_cover_art_urls, mut track_positions) = try_join!(
        load_release_cover_art_urls(&song_release_ids, db),
        load_release_track_positions(&song_ids, &song_release_ids, db),
    )?;

    Ok(izip!(
        songs,
        song_artists_list,
        song_credits_list,
        song_langs_list,
        localized_titles_list,
        song_releases_list,
        song_lyrics_list,
        song_links_list,
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
            links,
        )| {
            let artists = song_artists.fmap_into();

            let releases = song_releases
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

            let credits = song_credits
                .into_iter()
                .filter_map(|credit| {
                    credit_references.credit(credit.artist_id, credit.role_id)
                })
                .collect();

            let languages = song_languages
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

            let lyrics =
                build_song_lyrics(lyrics.into_iter().collect(), lang_cache);

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

async fn load_release_track_positions(
    song_ids: &[i32],
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<(i32, i32), Vec<ReleaseTrackPosition>>, DatabaseError> {
    if song_ids.is_empty() || release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let (discs, tracks) = try_join!(
        release_disc::Entity::find()
            .select_only()
            .column(release_disc::Column::Id)
            .column(release_disc::Column::ReleaseId)
            .filter(
                release_disc::Column::ReleaseId
                    .is_in(release_ids.iter().copied())
            )
            .order_by_asc(release_disc::Column::ReleaseId)
            .order_by_asc(release_disc::Column::Id)
            .into_tuple::<(i32, i32)>()
            .all(db),
        release_track::Entity::find()
            .select_only()
            .column(release_track::Column::SongId)
            .column(release_track::Column::ReleaseId)
            .column(release_track::Column::DiscId)
            .column(release_track::Column::TrackNumber)
            .filter(
                release_track::Column::SongId.is_in(song_ids.iter().copied())
            )
            .filter(
                release_track::Column::ReleaseId
                    .is_in(release_ids.iter().copied())
            )
            .order_by_asc(release_track::Column::DiscId)
            .order_by_asc(release_track::Column::Id)
            .into_tuple::<(i32, i32, i32, Option<String>)>()
            .all(db),
    )
    .db_operation("load release track positions")?;
    let disc_number_by_id = discs
        .chunk_by(|left, right| left.1 == right.1)
        .flat_map(|discs| {
            discs.iter().enumerate().map(|(index, &(id, _))| {
                (
                    id,
                    i32::try_from(index + 1)
                        .expect("release disc count fits in i32"),
                )
            })
        })
        .collect::<HashMap<_, _>>();
    let mut positions = HashMap::<_, Vec<_>>::new();
    for (song_id, release_id, disc_id, track_number) in tracks {
        positions.entry((song_id, release_id)).or_default().push(
            ReleaseTrackPosition {
                disc_number: disc_number_by_id[&disc_id],
                track_number,
            },
        );
    }
    Ok(positions)
}

async fn load_release_cover_art_urls(
    release_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, String>, DatabaseError> {
    if release_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let cover_art_urls_map = load_release_cover_art_urls_query(release_ids)
        .into_tuple::<(i32, String)>()
        .all(db)
        .await
        .db_operation("load release cover art image rows")?
        .into_iter()
        .collect::<HashMap<i32, String>>();

    Ok(cover_art_urls_map)
}

fn load_release_cover_art_urls_query(
    release_ids: &[i32],
) -> Select<release_image::Entity> {
    release_image::Entity::find()
        .select_only()
        .column(release_image::Column::ReleaseId)
        .column(image::Column::ObjectKey)
        .join(JoinType::InnerJoin, release_image::Relation::Image.def())
        .filter(
            release_image::Column::ReleaseId.is_in(release_ids.iter().copied()),
        )
        .filter(release_image::Column::Type.eq(ReleaseImageType::Cover))
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

#[derive(FromQueryResult)]
struct RelationReleaseRow {
    song_id: i32,
    id: i32,
    title: String,
    release_date: Option<chrono::NaiveDate>,
    release_date_precision: DatePrecision,
}

async fn load_relation_releases(
    song_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, SongRelease>, DatabaseError> {
    let releases = release_track::Entity::find()
        .select_only()
        .column(release_track::Column::SongId)
        .column(release::Column::Id)
        .column(release::Column::Title)
        .column(release::Column::ReleaseDate)
        .column(release::Column::ReleaseDatePrecision)
        .join(JoinType::InnerJoin, release_track::Relation::Release.def())
        .filter(release_track::Column::SongId.is_in(song_ids.iter().copied()))
        .distinct_on([(release_track::Entity, release_track::Column::SongId)])
        .order_by_asc(release_track::Column::SongId)
        .order_by_with_nulls(
            release::Column::ReleaseDate,
            sea_orm::Order::Asc,
            NullOrdering::Last,
        )
        .order_by_asc(release::Column::Id)
        .into_model::<RelationReleaseRow>()
        .all(db)
        .await
        .db_operation("load first related song releases")?;
    let release_ids = releases
        .iter()
        .map(|release| release.id)
        .unique()
        .collect::<Vec<_>>();
    let (cover_art_urls, mut track_positions) = try_join!(
        load_release_cover_art_urls(&release_ids, db),
        load_release_track_positions(song_ids, &release_ids, db),
    )?;

    Ok(releases
        .into_iter()
        .map(|release| {
            (
                release.song_id,
                SongRelease {
                    id: release.id,
                    title: release.title,
                    release_date: DateWithPrecision::from_option(
                        release.release_date,
                        release.release_date_precision,
                    ),
                    track_positions: track_positions
                        .remove(&(release.song_id, release.id))
                        .unwrap_or_default(),
                    cover_art_url: cover_art_urls.get(&release.id).cloned(),
                },
            )
        })
        .collect())
}

async fn load_relation_summaries(
    song_ids: &[i32],
    db: &impl ConnectionTrait,
) -> Result<HashMap<i32, SongRelationSummary>, DatabaseError> {
    let (songs, artist_rows, mut releases) = try_join!(
        async {
            song::Entity::find()
                .select_only()
                .column(song::Column::Id)
                .column(song::Column::Title)
                .filter(song::Column::Id.is_in(song_ids.iter().copied()))
                .into_tuple::<(i32, String)>()
                .all(db)
                .await
                .db_operation("load related songs")
        },
        async {
            song_artist::Entity::find()
                .select_only()
                .column(song_artist::Column::SongId)
                .column(artist::Column::Id)
                .column(artist::Column::Name)
                .join(JoinType::InnerJoin, song_artist::Relation::Artist.def())
                .filter(
                    song_artist::Column::SongId.is_in(song_ids.iter().copied()),
                )
                .order_by_asc(song_artist::Column::ArtistId)
                .into_tuple::<(i32, i32, String)>()
                .all(db)
                .await
                .db_operation("load related song artists")
        },
        load_relation_releases(song_ids, db),
    )
    .db_operation("load related song summaries")?;

    let mut artists = HashMap::<_, Vec<_>>::new();
    for (song_id, id, name) in artist_rows {
        artists
            .entry(song_id)
            .or_default()
            .push(SimpleArtist { id, name });
    }
    Ok(songs
        .into_iter()
        .map(|(id, title)| {
            (
                id,
                SongRelationSummary {
                    id,
                    title,
                    artists: artists.remove(&id).unwrap_or_default(),
                    release: releases.remove(&id),
                },
            )
        })
        .collect())
}

async fn load_song_relations(
    song_id: i32,
    db: &impl ConnectionTrait,
) -> Result<Vec<SongRelation>, DatabaseError> {
    let relations = song_relation::Entity::find()
        .filter(
            song_relation::Column::SourceId
                .eq(song_id)
                .or(song_relation::Column::DerivedId.eq(song_id)),
        )
        .order_by_asc(song_relation::Column::SourceId)
        .order_by_asc(song_relation::Column::DerivedId)
        .order_by_asc(song_relation::Column::RelationType)
        .all(db)
        .await
        .db_operation("load song relation rows")?;

    if relations.is_empty() {
        return Ok(vec![]);
    }

    let related_song_ids = relations
        .iter()
        .map(|relation| {
            if relation.source_id == song_id {
                relation.derived_id
            } else {
                relation.source_id
            }
        })
        .collect::<Vec<_>>();

    let related_song_map =
        load_relation_summaries(&related_song_ids, db).await?;

    Ok(build_song_relations(song_id, relations, &related_song_map))
}

fn build_song_relations(
    song_id: i32,
    relations: Vec<song_relation::Model>,
    related_song_map: &HashMap<i32, SongRelationSummary>,
) -> Vec<SongRelation> {
    relations
        .into_iter()
        .filter_map(|relation| {
            let (related_song_id, direction) = if relation.source_id == song_id
            {
                (relation.derived_id, SongRelationDirection::Source)
            } else {
                (relation.source_id, SongRelationDirection::Derived)
            };
            let song = related_song_map.get(&related_song_id).cloned()?;
            Some(SongRelation {
                song,
                direction,
                r#type: relation.relation_type,
                description: relation.description,
            })
        })
        .collect()
}

async fn find_sorted_by_correction(
    repo: &SeaOrmRepository,
    filter: SongFilter,
    sort_field: CorrectionSortField,
    sort_direction: SortDirection,
    pagination: crate::shared::http::PageQuery,
) -> Result<domain::shared::PageResponse<SongListing>, DatabaseError> {
    use entity::enums::EntityType;

    let entity_ids =
        crate::infra::database::utils::correction_sorted_entity_ids(
            &repo.conn,
            EntityType::Song,
            sort_field,
            match sort_direction {
                SortDirection::Asc => sea_orm::Order::Asc,
                SortDirection::Desc => sea_orm::Order::Desc,
            },
        )
        .await
        .db_operation("list correction-sorted song ids")?;

    if entity_ids.is_empty() {
        return Ok(utils::page_from_items(vec![], &pagination));
    }

    let select = filter
        .into_select()
        .filter(song::Column::Id.is_in(entity_ids.clone()));

    let mut songs = list::load(select, &repo.conn).await?;

    songs = crate::infra::database::utils::sort_by_id_list(
        songs,
        &entity_ids,
        |song| song.id,
    );

    Ok(utils::page_from_items(songs, &pagination))
}
