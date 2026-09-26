use anyhow::Context;
use chrono::{NaiveDate, Utc};
use entity::{
    artist_tag_vote, entity_popularity, release_disc, release_tag_vote,
    release_track, song_tag_vote,
};
use infra_db::SeaOrmRepository;
use popularity_core::PopularityEntityKind;
use sea_orm::ActiveValue::Set;
use sea_orm::sqlx::postgres::PgPoolOptions;
use sea_orm::{
    ActiveEnum, ActiveModelTrait, ConnectionTrait, EntityTrait,
    IntoActiveModel, SqlxPostgresConnector,
};
use serde_json::json;

use super::{find_artists, find_releases, find_songs};
use crate::features::tag::find::TagEntitySort;
use crate::infra::integration_test::fixture::{
    MockArtist, MockRelease, MockSong, MockTag, MockUser,
};
use crate::infra::integration_test::test_connection;
use crate::shared::http::PageQuery;

#[tokio::test]
async fn releases_with_at_least_one_positive_vote_are_returned()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let repo = SeaOrmRepository::new(conn.clone());
    let tag = MockTag::named("find-releases-target").insert(&conn).await?;
    let other_tag = MockTag::named("find-releases-other").insert(&conn).await?;
    let positive_user = MockUser::with_label("find-releases-positive")
        .insert(&conn)
        .await?;
    let veto_user = MockUser::with_label("find-releases-veto")
        .insert(&conn)
        .await?;
    let qualifying = MockRelease::titled("find releases qualifying")
        .insert(&conn)
        .await?;
    let veto_only = MockRelease::titled("find releases veto only")
        .insert(&conn)
        .await?;
    let different_tag = MockRelease::titled("find releases different tag")
        .insert(&conn)
        .await?;

    release_tag_vote::Entity::insert_many([
        release_tag_vote::ActiveModel {
            release_id: Set(qualifying.id),
            tag_id: Set(tag.id),
            user_id: Set(positive_user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        },
        release_tag_vote::ActiveModel {
            release_id: Set(qualifying.id),
            tag_id: Set(tag.id),
            user_id: Set(veto_user.id),
            score: Set(-3),
            voted_at: Set(Utc::now().into()),
        },
        release_tag_vote::ActiveModel {
            release_id: Set(veto_only.id),
            tag_id: Set(tag.id),
            user_id: Set(veto_user.id),
            score: Set(-3),
            voted_at: Set(Utc::now().into()),
        },
        release_tag_vote::ActiveModel {
            release_id: Set(different_tag.id),
            tag_id: Set(other_tag.id),
            user_id: Set(positive_user.id),
            score: Set(1),
            voted_at: Set(Utc::now().into()),
        },
    ])
    .exec(&conn)
    .await?;

    let pagination: PageQuery =
        serde_json::from_value(json!({ "limit": 100 }))?;
    let page = find_releases(&repo, tag.id, TagEntitySort::Popular, pagination)
        .await?;

    assert_eq!(page.total_items, 1);
    assert_eq!(
        page.items
            .into_iter()
            .map(|item| item.id)
            .collect::<Vec<_>>(),
        vec![qualifying.id]
    );

    Ok(())
}

async fn insert_tagged_entity(
    conn: &impl ConnectionTrait,
    kind: PopularityEntityKind,
    tag_id: i32,
    user_id: i32,
    label: &str,
) -> anyhow::Result<i32> {
    let id = match kind {
        PopularityEntityKind::Release => {
            MockRelease::titled(label).insert(conn).await?.id
        }
        PopularityEntityKind::Artist => {
            MockArtist::named(label).insert(conn).await?.id
        }
        PopularityEntityKind::Song => {
            MockSong::titled(label).insert(conn).await?.id
        }
    };

    match kind {
        PopularityEntityKind::Release => {
            release_tag_vote::ActiveModel {
                release_id: Set(id),
                tag_id: Set(tag_id),
                user_id: Set(user_id),
                score: Set(1),
                voted_at: Set(Utc::now().into()),
            }
            .insert(conn)
            .await?;
        }
        PopularityEntityKind::Artist => {
            artist_tag_vote::ActiveModel {
                artist_id: Set(id),
                tag_id: Set(tag_id),
                user_id: Set(user_id),
                score: Set(1),
                voted_at: Set(Utc::now().into()),
            }
            .insert(conn)
            .await?;
        }
        PopularityEntityKind::Song => {
            song_tag_vote::ActiveModel {
                song_id: Set(id),
                tag_id: Set(tag_id),
                user_id: Set(user_id),
                score: Set(1),
                voted_at: Set(Utc::now().into()),
            }
            .insert(conn)
            .await?;
        }
    }

    Ok(id)
}

#[tokio::test]
async fn tagged_entities_are_ranked_by_their_own_popularity_scores()
-> anyhow::Result<()> {
    test_connection().await?.close().await?;

    // Isolate scores while allowing repository queries to use a connection.
    let pool = PgPoolOptions::new()
        .min_connections(1)
        .max_connections(1)
        .idle_timeout(None)
        .max_lifetime(None)
        .connect(&infra_testing::test_database_url())
        .await?;
    let conn = SqlxPostgresConnector::from_sqlx_postgres_pool(pool);
    conn.execute_unprepared(
        "CREATE TEMP TABLE entity_popularity (LIKE public.entity_popularity INCLUDING ALL)",
    ).await?;

    let repo = SeaOrmRepository::new(conn.clone());
    let user = MockUser::with_label("tag-popularity").insert(&conn).await?;
    let kinds = [
        PopularityEntityKind::Release,
        PopularityEntityKind::Artist,
        PopularityEntityKind::Song,
    ];

    for kind in kinds {
        entity_popularity::Entity::delete_many().exec(&conn).await?;

        let tag = MockTag::named(format!("popularity-{kind:?}"))
            .insert(&conn)
            .await?;
        let mut ids = Vec::new();

        for label in ["unscored", "low", "high"] {
            ids.push(
                insert_tagged_entity(&conn, kind, tag.id, user.id, label)
                    .await?,
            );
        }

        for (index, &id) in ids.iter().enumerate() {
            for score_kind in kinds {
                let score = if score_kind == kind {
                    [None, Some(0.2), Some(0.8)][index]
                } else {
                    Some([1.0, 0.9, 0.1][index])
                };

                if let Some(score) = score {
                    entity_popularity::ActiveModel {
                        entity_type: Set(score_kind.to_value()),
                        entity_id: Set(id),
                        score: Set(score),
                    }
                    .insert(&conn)
                    .await?;
                }
            }
        }

        let pagination = serde_json::from_value(json!({ "limit": 100 }))?;
        let actual: Vec<_> = match kind {
            PopularityEntityKind::Release => {
                find_releases(&repo, tag.id, TagEntitySort::Popular, pagination)
                    .await?
                    .items
                    .into_iter()
                    .map(|item| item.id)
                    .collect()
            }
            PopularityEntityKind::Artist => {
                find_artists(&repo, tag.id, pagination)
                    .await?
                    .items
                    .into_iter()
                    .map(|item| item.id)
                    .collect()
            }
            PopularityEntityKind::Song => {
                find_songs(&repo, tag.id, TagEntitySort::Popular, pagination)
                    .await?
                    .items
                    .into_iter()
                    .map(|item| item.id)
                    .collect()
            }
        };

        assert_eq!(actual, [ids[2], ids[1], ids[0]], "{kind:?}");
    }

    conn.close().await?;

    Ok(())
}

#[tokio::test]
async fn songs_are_ranked_by_their_earliest_known_release_date_with_unknown_dates_last()
-> anyhow::Result<()> {
    let conn = test_connection().await?;
    let repo = SeaOrmRepository::new(conn.clone());
    let tag = MockTag::named("song-release-date").insert(&conn).await?;
    let user = MockUser::with_label("song-release-date")
        .insert(&conn)
        .await?;
    let mut songs = Vec::new();

    for label in [
        "unreleased",
        "unknown date",
        "old song reissued",
        "newer song",
    ] {
        songs.push(
            insert_tagged_entity(
                &conn,
                PopularityEntityKind::Song,
                tag.id,
                user.id,
                label,
            )
            .await?,
        );
    }

    for (song_id, year) in [
        (songs[1], None),
        (songs[2], Some(2010)),
        (songs[2], Some(2025)),
        (songs[2], None),
        (songs[3], Some(2020)),
    ] {
        let mut release =
            MockRelease::titled("song date fixture").into_active_model();
        release.release_date = Set(year
            .map(|year| {
                NaiveDate::from_ymd_opt(year, 1, 1)
                    .context("valid release date")
            })
            .transpose()?);
        let release = release.insert(&conn).await?;
        let disc = release_disc::ActiveModel {
            release_id: Set(release.id),
            name: Set(None),
            ..Default::default()
        }
        .insert(&conn)
        .await?;

        release_track::ActiveModel {
            release_id: Set(release.id),
            song_id: Set(song_id),
            disc_id: Set(disc.id),
            ..Default::default()
        }
        .insert(&conn)
        .await?;
    }

    let pagination = serde_json::from_value(json!({ "limit": 100 }))?;
    let page =
        find_songs(&repo, tag.id, TagEntitySort::ReleaseDate, pagination)
            .await?;

    assert_eq!(
        page.items
            .into_iter()
            .map(|song| song.id)
            .collect::<Vec<_>>(),
        [songs[3], songs[2], songs[0], songs[1]]
    );

    Ok(())
}
