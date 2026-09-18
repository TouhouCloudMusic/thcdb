use anyhow::Context;
use chrono::NaiveDate;
use domain::shared::DatePrecision;
use entity::enums::{ArtistType, ReleaseType};
use entity::{
    artist, credit_role, release, release_artist, release_credit, release_disc,
    release_track, song, song_credit,
};
use infra_db::SeaOrmRepository;
use infra_testing::test_connection;
use itertools::Itertools;
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, IntoActiveModel,
};

use super::*;
use crate::model::{
    ArtistCreditScope, ArtistCreditSort, ArtistCredits, ArtistSongCredit,
    Credit, CreditQuery, Disc,
};

mod stable_cursor;

struct MockSong {
    title: String,
}

impl MockSong {
    fn titled(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
        }
    }

    async fn insert(
        self,
        conn: &impl sea_orm::ConnectionTrait,
    ) -> Result<song::Model, sea_orm::DbErr> {
        song::Entity::insert(song::ActiveModel {
            id: NotSet,
            title: Set(self.title),
        })
        .exec_with_returning(conn)
        .await
    }
}

struct MockArtist {
    name: String,
}

impl MockArtist {
    fn named(name: impl Into<String>) -> Self {
        Self { name: name.into() }
    }

    async fn insert(
        self,
        conn: &impl sea_orm::ConnectionTrait,
    ) -> Result<artist::Model, sea_orm::DbErr> {
        artist::Entity::insert(artist::ActiveModel {
            id: NotSet,
            name: Set(self.name),
            artist_type: Set(ArtistType::Solo),
            text_alias: Set(None),
            start_date: Set(None),
            start_date_precision: Set(None),
            end_date: Set(None),
            end_date_precision: Set(None),
            current_location_country: Set(None),
            current_location_province: Set(None),
            current_location_city: Set(None),
            start_location_country: Set(None),
            start_location_province: Set(None),
            start_location_city: Set(None),
        })
        .exec_with_returning(conn)
        .await
    }
}

struct MockRelease {
    title: String,
}

impl MockRelease {
    fn titled(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
        }
    }

    async fn insert(
        self,
        conn: &impl sea_orm::ConnectionTrait,
    ) -> Result<release::Model, sea_orm::DbErr> {
        release::Entity::insert(release::ActiveModel {
            id: NotSet,
            title: Set(self.title),
            release_type: Set(ReleaseType::Album),
            release_date: Set(None),
            release_date_precision: Set(DatePrecision::Day),
            recording_date_start: Set(None),
            recording_date_start_precision: Set(DatePrecision::Day),
            recording_date_end: Set(None),
            recording_date_end_precision: Set(DatePrecision::Day),
        })
        .exec_with_returning(conn)
        .await
    }
}

async fn insert_credit_roles(
    db: &DatabaseConnection,
    fixture_id: i32,
    count: u8,
) -> anyhow::Result<Vec<credit_role::Model>> {
    let mut roles = Vec::with_capacity(count.into());
    for index in 0..count {
        let name = format!("artist credit test {fixture_id} role {index}");
        roles.push(
            credit_role::Entity::insert(credit_role::ActiveModel {
                id: NotSet,
                name: Set(name.clone()),
                short_description: Set(format!("{name} short")),
                description: Set(format!("{name} description")),
            })
            .exec_with_returning(db)
            .await?,
        );
    }
    Ok(roles)
}

async fn insert_release_credits(
    db: &DatabaseConnection,
    artist_id: i32,
    credits: &[(i32, i32)],
) -> anyhow::Result<()> {
    release_credit::Entity::insert_many(credits.iter().map(
        |&(release_id, role_id)| release_credit::ActiveModel {
            id: NotSet,
            artist_id: Set(artist_id),
            release_id: Set(release_id),
            role_id: Set(role_id),
            on: Set(None),
        },
    ))
    .exec(db)
    .await?;
    Ok(())
}

async fn insert_release_credits_for_roles(
    db: &DatabaseConnection,
    artist_id: i32,
    releases: &[release::Model],
    roles: &[credit_role::Model],
    extra_role_release: Option<i32>,
) -> anyhow::Result<()> {
    let credits = releases
        .iter()
        .flat_map(|release| {
            let first = (release.id, roles[0].id);
            if extra_role_release == Some(release.id) {
                vec![first, (release.id, roles[1].id)]
            } else {
                vec![first]
            }
        })
        .collect_vec();
    insert_release_credits(db, artist_id, &credits).await
}

async fn insert_song_credits(
    db: &DatabaseConnection,
    artist_id: i32,
    credits: &[(i32, Option<i32>)],
) -> anyhow::Result<()> {
    song_credit::Entity::insert_many(credits.iter().map(
        |&(song_id, role_id)| song_credit::ActiveModel {
            song_id: Set(song_id),
            artist_id: Set(artist_id),
            role_id: Set(role_id),
            id: NotSet,
        },
    ))
    .exec(db)
    .await?;
    Ok(())
}

async fn insert_songs(
    db: &DatabaseConnection,
    titles: &[&str],
) -> anyhow::Result<Vec<song::Model>> {
    let mut songs = Vec::with_capacity(titles.len());
    for title in titles {
        songs.push(MockSong::titled(*title).insert(db).await?);
    }
    Ok(songs)
}

async fn insert_release_with_tracks(
    db: &DatabaseConnection,
    title: &str,
    release_date: Option<NaiveDate>,
    tracks: &[(i32, &str)],
) -> anyhow::Result<release::Model> {
    let release = MockRelease::titled(title).insert(db).await?;
    let release = if let Some(release_date) = release_date {
        let mut release = release.into_active_model();
        release.release_date = Set(Some(release_date));
        release.update(db).await?
    } else {
        release
    };
    insert_disc_with_tracks(db, release.id, None, tracks).await?;
    Ok(release)
}

async fn insert_disc_with_tracks(
    db: &DatabaseConnection,
    release_id: i32,
    name: Option<&str>,
    tracks: &[(i32, &str)],
) -> anyhow::Result<release_disc::Model> {
    let disc = release_disc::Entity::insert(release_disc::ActiveModel {
        id: NotSet,
        release_id: Set(release_id),
        name: Set(name.map(str::to_owned)),
    })
    .exec_with_returning(db)
    .await?;
    if !tracks.is_empty() {
        release_track::Entity::insert_many(tracks.iter().map(
            |&(song_id, track_number)| release_track::ActiveModel {
                id: NotSet,
                release_id: Set(release_id),
                song_id: Set(song_id),
                track_number: Set(Some(track_number.to_string())),
                display_title: Set(None),
                duration: Set(None),
                disc_id: Set(disc.id),
            },
        ))
        .exec(db)
        .await?;
    }
    Ok(disc)
}

type ReleaseSpec<'a> = (&'a str, Option<NaiveDate>, Vec<(i32, &'a str)>);

#[derive(Clone)]
struct ReleasePageExpectation {
    release_id: i32,
    release_roles: Vec<i32>,
    song_ids: Vec<i32>,
    song_roles: Vec<Vec<i32>>,
    owner: Option<i32>,
}

async fn insert_releases(
    db: &DatabaseConnection,
    specs: &[ReleaseSpec<'_>],
) -> anyhow::Result<Vec<release::Model>> {
    let mut releases = Vec::with_capacity(specs.len());
    for (title, date, tracks) in specs {
        releases
            .push(insert_release_with_tracks(db, title, *date, tracks).await?);
    }
    Ok(releases)
}

fn role_ids(credit: &ArtistSongCredit) -> Vec<i32> {
    credit
        .roles
        .iter()
        .map(|role| role.id)
        .sorted_unstable()
        .collect()
}

fn release_role_ids(credit: &Credit) -> Vec<i32> {
    credit
        .roles
        .iter()
        .map(|role| role.id)
        .sorted_unstable()
        .collect()
}

fn release_ids(page: &ArtistCredits) -> Vec<i32> {
    page.release
        .iter()
        .map(|credit| credit.release_id)
        .collect()
}

fn song_ids(page: &ArtistCredits) -> Vec<i32> {
    page.song.iter().map(|song| song.song_id).collect()
}

fn assert_credit_page(
    page: &ArtistCredits,
    expected_release_ids: &[i32],
    expected_release_roles: &[i32],
    expected_song_ids: &[i32],
    expected_song_roles: &[Vec<i32>],
    expected_owner: Option<i32>,
) {
    assert_eq!(release_ids(page), expected_release_ids);
    assert_eq!(song_ids(page), expected_song_ids);
    if let Some(release) = page.release.first() {
        assert_eq!(release_role_ids(release), expected_release_roles);
    } else {
        assert_eq!(expected_release_roles.len(), 0);
    }
    assert_eq!(page.song.len(), expected_song_roles.len());
    for (song, expected_roles) in page.song.iter().zip(expected_song_roles) {
        assert_eq!(role_ids(song).as_slice(), expected_roles.as_slice());
        assert_eq!(song.primary_release_id, expected_owner);
        if expected_owner.is_none() {
            assert_eq!(song.releases.len(), 0);
        }
    }
}

fn assert_release_group_pages(
    pages: &[ArtistCredits],
    expected: &[ReleasePageExpectation],
) {
    assert_eq!(pages.len(), expected.len());
    for (page, expectation) in pages.iter().zip(expected) {
        assert_credit_page(
            page,
            &[expectation.release_id],
            &expectation.release_roles,
            &expectation.song_ids,
            &expectation.song_roles,
            expectation.owner,
        );
    }
}

fn release_track_keys(
    credit: &ArtistSongCredit,
) -> Vec<(i32, Option<Disc>, Option<String>)> {
    credit
        .releases
        .iter()
        .map(|release| {
            (
                release.release_id,
                release.disc.clone(),
                release.track_number.clone(),
            )
        })
        .collect()
}

async fn query_credit_pages(
    repo: &SeaOrmRepository,
    query: CreditQuery,
) -> anyhow::Result<Vec<ArtistCredits>> {
    let CreditQuery {
        artist_id,
        limit,
        scope,
        sort,
        role_id,
        cursor: initial_cursor,
    } = query;
    let mut cursor = initial_cursor;
    let mut pages = Vec::new();
    let mut seen_cursors = Vec::new();
    loop {
        assert!(
            !cursor
                .as_ref()
                .is_some_and(|cursor| seen_cursors.contains(cursor)),
            "pagination cursor repeated: {cursor:?}"
        );
        if let Some(cursor) = cursor.clone() {
            seen_cursors.push(cursor);
        }
        let page = credits(
            repo,
            CreditQuery {
                artist_id,
                cursor,
                limit,
                scope,
                sort,
                role_id,
            },
        )
        .await?;
        let next_cursor = page.next_cursor.clone();
        pages.push(page);
        let Some(next_cursor) = next_cursor else {
            break;
        };
        cursor = Some(next_cursor);
    }
    Ok(pages)
}

#[tokio::test]
async fn release_credit_pages_keep_groups_complete_in_requested_date_order()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("complete release group pagination artist")
        .insert(&conn)
        .await?;
    let songs_n = insert_songs(&conn, &["A", "B", "C"]).await?;
    let song_n1 = &songs_n[0];
    let song_n2 = &songs_n[1];
    let song_n3 = &songs_n[2];
    let date_2025 =
        NaiveDate::from_ymd_opt(2025, 1, 1).context("invalid N date")?;
    let date_2024 =
        NaiveDate::from_ymd_opt(2024, 1, 1).context("invalid 2024 date")?;
    let release_specs = [
        (
            "Z",
            Some(date_2025),
            vec![(song_n1.id, "1"), (song_n2.id, "2"), (song_n3.id, "3")],
        ),
        ("A", Some(date_2024), Vec::new()),
        ("B", Some(date_2024), Vec::new()),
        ("B", Some(date_2024), Vec::new()),
        ("A", None, Vec::new()),
        ("A", None, Vec::new()),
    ];
    let releases = insert_releases(&conn, &release_specs).await?;
    let release_n_id = releases[0].id;
    let roles = insert_credit_roles(&conn, artist.id, 2).await?;
    insert_release_credits_for_roles(
        &conn,
        artist.id,
        &releases,
        &roles,
        Some(release_n_id),
    )
    .await?;
    let song_credits = songs_n
        .iter()
        .map(|song| (song.id, Some(roles[0].id)))
        .collect_vec();
    insert_song_credits(&conn, artist.id, &song_credits).await?;
    let regular_page = ReleasePageExpectation {
        release_id: releases[1].id,
        release_roles: vec![roles[0].id],
        song_ids: vec![],
        song_roles: vec![],
        owner: None,
    };
    let newest_page = ReleasePageExpectation {
        release_id: release_n_id,
        release_roles: vec![roles[0].id, roles[1].id],
        song_ids: vec![song_n1.id, song_n2.id, song_n3.id],
        song_roles: vec![vec![roles[0].id]; 3],
        owner: Some(release_n_id),
    };
    for (sort, expected_indices) in [
        (ArtistCreditSort::Newest, [0, 1, 2, 3, 4, 5]),
        (ArtistCreditSort::Oldest, [1, 2, 3, 0, 4, 5]),
    ] {
        let expected_release_ids = expected_indices
            .into_iter()
            .map(|index| releases[index].id)
            .collect_vec();
        let pages = query_credit_pages(
            &repo,
            CreditQuery {
                artist_id: artist.id,
                cursor: None,
                limit: 1,
                scope: ArtistCreditScope::All,
                sort,
                role_id: None,
            },
        )
        .await?;
        let actual_release_ids =
            pages.iter().flat_map(release_ids).collect_vec();
        assert_eq!(actual_release_ids, expected_release_ids);
        let expected_pages = expected_release_ids
            .iter()
            .map(|&release_id| {
                if release_id == release_n_id {
                    newest_page.clone()
                } else {
                    ReleasePageExpectation {
                        release_id,
                        ..regular_page.clone()
                    }
                }
            })
            .collect_vec();
        assert_release_group_pages(&pages, &expected_pages);
    }
    Ok(())
}

#[tokio::test]
async fn orphan_song_credits_are_paginated_after_release_groups()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("orphan credit pagination artist")
        .insert(&conn)
        .await?;
    let songs = insert_songs(&conn, &["Z", "A", "B", "B"]).await?;
    let song_z = &songs[0];
    let release = insert_release_with_tracks(
        &conn,
        "orphan pagination release",
        Some(
            NaiveDate::from_ymd_opt(2025, 1, 1)
                .context("invalid release date")?,
        ),
        &[(song_z.id, "1")],
    )
    .await?;
    let song_a = &songs[1];
    let song_b1 = &songs[2];
    let song_b2 = &songs[3];
    let roles = insert_credit_roles(&conn, artist.id, 2).await?;
    insert_release_credits(&conn, artist.id, &[(release.id, roles[0].id)])
        .await?;
    let song_credits = [
        (song_z.id, Some(roles[0].id)),
        (song_a.id, Some(roles[0].id)),
        (song_a.id, Some(roles[1].id)),
        (song_b1.id, Some(roles[0].id)),
        (song_b2.id, None),
    ];
    insert_song_credits(&conn, artist.id, &song_credits).await?;
    let expected_songs = [
        vec![song_z.id],
        vec![song_a.id, song_b1.id],
        vec![song_b2.id],
    ];
    let expected_roles = [
        vec![vec![roles[0].id]],
        vec![vec![roles[0].id, roles[1].id], vec![roles[0].id]],
        vec![vec![]],
    ];
    let pages = query_credit_pages(
        &repo,
        CreditQuery {
            artist_id: artist.id,
            cursor: None,
            limit: 2,
            scope: ArtistCreditScope::All,
            sort: ArtistCreditSort::Newest,
            role_id: None,
        },
    )
    .await?;
    assert_eq!(pages.len(), expected_songs.len());
    for (index, page) in pages.iter().enumerate() {
        let expected_release_ids =
            (index == 0).then_some(vec![release.id]).unwrap_or_default();
        let expected_release_roles = (index == 0)
            .then_some(vec![roles[0].id])
            .unwrap_or_default();
        assert_credit_page(
            page,
            &expected_release_ids,
            &expected_release_roles,
            &expected_songs[index],
            &expected_roles[index],
            (index == 0).then_some(release.id),
        );
    }
    Ok(())
}

#[tokio::test]
async fn song_credits_keep_artist_roles_and_release_tracks_with_their_song()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("song credit relation artist")
        .insert(&conn)
        .await?;
    let other_artist = MockArtist::named("other song credit relation artist")
        .insert(&conn)
        .await?;
    let songs = insert_songs(&conn, &["A", "B", "C"]).await?;
    let song_a = &songs[0];
    let song_b = &songs[1];
    let song_c = &songs[2];
    let release_date =
        NaiveDate::from_ymd_opt(2025, 5, 5).context("invalid fixture date")?;
    let release_x = insert_release_with_tracks(
        &conn,
        "song credit release X",
        Some(release_date),
        &[(song_a.id, "2"), (song_b.id, "5")],
    )
    .await?;
    let release_y = insert_release_with_tracks(
        &conn,
        "song credit release Y",
        None,
        &[(song_a.id, "8"), (song_a.id, "10"), (song_c.id, "9")],
    )
    .await?;
    let roles = insert_credit_roles(&conn, artist.id, 3).await?;
    let artist_credits = [
        (song_a.id, Some(roles[0].id)),
        (song_a.id, Some(roles[1].id)),
        (song_b.id, Some(roles[0].id)),
    ];
    insert_song_credits(&conn, artist.id, &artist_credits).await?;
    let other_credits = [
        (song_a.id, Some(roles[2].id)),
        (song_c.id, Some(roles[2].id)),
    ];
    insert_song_credits(&conn, other_artist.id, &other_credits).await?;
    let result = credits(
        &repo,
        CreditQuery {
            artist_id: artist.id,
            cursor: None,
            limit: 1,
            scope: ArtistCreditScope::Song,
            sort: ArtistCreditSort::Newest,
            role_id: None,
        },
    )
    .await?;
    assert_credit_page(
        &result,
        &[release_x.id],
        &[],
        &[song_a.id, song_b.id],
        &[vec![roles[0].id, roles[1].id], vec![roles[0].id]],
        Some(release_x.id),
    );
    assert!(result.next_cursor.is_none());
    let credit_a = &result.song[0];
    assert_eq!(
        release_track_keys(credit_a),
        [
            (release_x.id, None, Some("2".to_owned())),
            (release_y.id, None, Some("8".to_owned())),
            (release_y.id, None, Some("10".to_owned())),
        ]
    );
    let credit_b = &result.song[1];
    assert_eq!(role_ids(credit_b), [roles[0].id]);
    assert_eq!(credit_b.primary_release_id, Some(release_x.id));
    assert_eq!(
        release_track_keys(credit_b),
        [(release_x.id, None, Some("5".to_owned()))]
    );
    Ok(())
}

#[tokio::test]
async fn song_credit_reports_disc_position_when_only_a_later_disc_matches()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("multi-disc credit artist")
        .insert(&conn)
        .await?;
    let songs =
        insert_songs(&conn, &["disc one song", "disc two song"]).await?;
    let release = insert_release_with_tracks(
        &conn,
        "multi-disc credit release",
        None,
        &[(songs[0].id, "1")],
    )
    .await?;
    insert_disc_with_tracks(
        &conn,
        release.id,
        Some("Bonus"),
        &[(songs[1].id, "4")],
    )
    .await?;
    let roles = insert_credit_roles(&conn, artist.id, 1).await?;
    insert_song_credits(&conn, artist.id, &[(songs[1].id, Some(roles[0].id))])
        .await?;

    let result = credits(
        &repo,
        CreditQuery {
            artist_id: artist.id,
            cursor: None,
            limit: 1,
            scope: ArtistCreditScope::Song,
            sort: ArtistCreditSort::Newest,
            role_id: None,
        },
    )
    .await?;

    assert_eq!(result.song.len(), 1);
    assert_eq!(
        release_track_keys(&result.song[0]),
        [(
            release.id,
            Some(Disc {
                index: 2,
                name: Some("Bonus".to_owned()),
            }),
            Some("4".to_owned()),
        )]
    );
    Ok(())
}

#[tokio::test]
async fn credit_filters_keep_complete_roles_and_release_context_for_matching_entities()
-> anyhow::Result<()> {
    let conn = test_connection().await;
    let repo = SeaOrmRepository::new(conn.clone());
    let artist = MockArtist::named("credit filter target artist")
        .insert(&conn)
        .await?;
    let songs = insert_songs(&conn, &["shared", "extra", "orphan"]).await?;
    let shared = &songs[0];
    let extra = &songs[1];
    let orphan = &songs[2];
    let old_date =
        NaiveDate::from_ymd_opt(2023, 1, 1).context("invalid old date")?;
    let new_date =
        NaiveDate::from_ymd_opt(2025, 1, 1).context("invalid new date")?;
    let release_specs = [
        ("old", Some(old_date), vec![(shared.id, "old")]),
        (
            "new",
            Some(new_date),
            vec![(shared.id, "new"), (extra.id, "extra")],
        ),
    ];
    let releases = insert_releases(&conn, &release_specs).await?;
    let (old, new) = (&releases[0], &releases[1]);
    let roles = insert_credit_roles(&conn, artist.id, 2).await?;
    let release_credits = [
        (old.id, roles[0].id),
        (old.id, roles[1].id),
        (new.id, roles[0].id),
        (new.id, roles[1].id),
    ];
    insert_release_credits(&conn, artist.id, &release_credits).await?;
    release_artist::Entity::insert(release_artist::ActiveModel {
        release_id: Set(new.id),
        artist_id: Set(artist.id),
    })
    .exec(&conn)
    .await?;
    let song_credits = [
        (shared.id, Some(roles[0].id)),
        (shared.id, Some(roles[1].id)),
        (extra.id, Some(roles[1].id)),
        (orphan.id, Some(roles[1].id)),
    ];
    insert_song_credits(&conn, artist.id, &song_credits).await?;
    let old_page = ReleasePageExpectation {
        release_id: old.id,
        release_roles: vec![roles[0].id, roles[1].id],
        song_ids: vec![],
        song_roles: vec![],
        owner: None,
    };
    let new_page = ReleasePageExpectation {
        release_id: new.id,
        release_roles: vec![],
        song_ids: vec![shared.id],
        song_roles: vec![vec![roles[0].id, roles[1].id]],
        owner: Some(new.id),
    };
    let all_oldest = vec![old_page.clone(), new_page.clone()];
    let song_only = vec![new_page];
    let release_only = vec![old_page];
    for (scope, sort, expected_pages) in [
        (ArtistCreditScope::All, ArtistCreditSort::Oldest, all_oldest),
        (ArtistCreditScope::Song, ArtistCreditSort::Newest, song_only),
        (
            ArtistCreditScope::Release,
            ArtistCreditSort::Oldest,
            release_only,
        ),
    ] {
        let pages = query_credit_pages(
            &repo,
            CreditQuery {
                artist_id: artist.id,
                cursor: None,
                limit: 1,
                scope,
                sort,
                role_id: Some(roles[0].id),
            },
        )
        .await?;
        assert_release_group_pages(&pages, &expected_pages);
        if matches!(scope, ArtistCreditScope::All) {
            let shared_page = pages
                .iter()
                .find(|page| release_ids(page) == [new.id])
                .context("missing shared song page")?;
            assert_eq!(
                release_track_keys(&shared_page.song[0]),
                [
                    (old.id, None, Some("old".to_string())),
                    (new.id, None, Some("new".to_string())),
                ]
            );
        }
    }
    Ok(())
}
