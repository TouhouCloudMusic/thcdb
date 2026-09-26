use std::collections::BTreeMap;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use entity::{entity_popularity, release_tag_vote};
use fred::prelude::*;
use sea_orm::ActiveValue::Set;
use sea_orm::sqlx::postgres::PgPoolOptions;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, SqlxPostgresConnector, TransactionTrait,
};
use visit_core::EntityType;

use super::{
    PopularityEntity, PopularityEntityKind, RANKING_LIMIT, load_ranking,
    participation, refresh_scores, store_scores,
};

async fn isolated_snapshot() -> Result<DatabaseConnection> {
    infra_testing::test_connection().await.close().await?;

    // Keep the temporary tables on one session across publication commits.
    let pool = PgPoolOptions::new()
        .min_connections(1)
        .max_connections(1)
        .idle_timeout(None)
        .max_lifetime(None)
        .connect(&infra_testing::test_database_url())
        .await?;
    let db = SqlxPostgresConnector::from_sqlx_postgres_pool(pool);

    db.execute_unprepared(
        "CREATE TEMP TABLE entity_popularity (LIKE public.entity_popularity INCLUDING ALL);
         CREATE TEMP TABLE popularity_snapshot (LIKE public.popularity_snapshot INCLUDING ALL);",
    )
    .await?;

    Ok(db)
}

async fn snapshot_time(db: &impl ConnectionTrait) -> Result<DateTime<Utc>> {
    let row = db
        .query_one(sea_orm::Statement::from_string(
            db.get_database_backend(),
            "SELECT calculated_at FROM popularity_snapshot",
        ))
        .await?
        .context("snapshot should exist")?;

    Ok(row.try_get("", "calculated_at")?)
}

#[tokio::test]
async fn each_entity_kind_returns_its_highest_scored_items_up_to_the_ranking_limit()
-> Result<()> {
    let db = isolated_snapshot().await?;
    let limit = usize::try_from(RANKING_LIMIT)?;
    let count = i32::try_from(limit + 1)?;
    let mut items = Vec::new();

    for id in 1..=count {
        let score = f64::from(id) / f64::from(count + 1);

        items.extend([
            (
                PopularityEntity {
                    kind: PopularityEntityKind::Release,
                    id,
                },
                score,
            ),
            (
                PopularityEntity {
                    kind: PopularityEntityKind::Artist,
                    id,
                },
                1.0 - score,
            ),
            (
                PopularityEntity {
                    kind: PopularityEntityKind::Song,
                    id: count + id,
                },
                score,
            ),
        ]);
    }

    store_scores(&db, &items, Utc::now()).await?;

    let ranking = load_ranking(&db).await?;

    assert_eq!(
        ranking.release_ids,
        (1..=count).rev().take(limit).collect::<Vec<_>>()
    );
    assert_eq!(
        ranking.artist_ids,
        (1..=count).take(limit).collect::<Vec<_>>()
    );
    assert_eq!(
        ranking.song_ids,
        (count + 1..=2 * count)
            .rev()
            .take(limit)
            .collect::<Vec<_>>()
    );

    db.close().await?;

    Ok(())
}

#[tokio::test]
async fn equally_scored_items_are_ranked_by_ascending_id() -> Result<()> {
    let db = isolated_snapshot().await?;
    let limit = usize::try_from(RANKING_LIMIT)?;
    let mut items = Vec::new();

    for kind in [
        PopularityEntityKind::Release,
        PopularityEntityKind::Artist,
        PopularityEntityKind::Song,
    ] {
        for id in [13, 11, 12] {
            items.push((PopularityEntity { kind, id }, 0.5));
        }
    }

    store_scores(&db, &items, Utc::now()).await?;

    let ranking = load_ranking(&db).await?;
    let expected: Vec<_> = [11, 12, 13].into_iter().take(limit).collect();

    assert_eq!(ranking.release_ids, expected);
    assert_eq!(ranking.artist_ids, expected);
    assert_eq!(ranking.song_ids, expected);

    db.close().await?;

    Ok(())
}

#[tokio::test]
async fn a_failed_snapshot_publish_preserves_previous_scores_and_timestamp()
-> Result<()> {
    let db = isolated_snapshot().await?;
    let old_time = DateTime::from_timestamp(1_700_000_000, 0)
        .context("valid timestamp")?;

    store_scores(
        &db,
        &[
            (
                PopularityEntity {
                    kind: PopularityEntityKind::Release,
                    id: 11,
                },
                0.7,
            ),
            (
                PopularityEntity {
                    kind: PopularityEntityKind::Song,
                    id: 12,
                },
                0.4,
            ),
        ],
        old_time,
    )
    .await?;

    db.execute_unprepared(
        "ALTER TABLE popularity_snapshot ADD CHECK (calculated_at = to_timestamp(1700000000))",
    ).await?;

    let result = store_scores(
        &db,
        &[(
            PopularityEntity {
                kind: PopularityEntityKind::Artist,
                id: 13,
            },
            0.9,
        )],
        old_time + chrono::Duration::hours(1),
    )
    .await;

    assert!(result.is_err());

    let scores: Vec<(String, i32, f64)> = db.query_all(sea_orm::Statement::from_string(
        db.get_database_backend(),
        "SELECT entity_type, entity_id, score FROM entity_popularity ORDER BY entity_type, entity_id",
    )).await?
        .iter()
        .map(sea_orm::QueryResult::try_get_many_by_index)
        .collect::<Result<_, _>>()?;

    assert_eq!(
        scores,
        [("release".into(), 11, 0.7), ("song".into(), 12, 0.4),]
    );
    assert_eq!(snapshot_time(&db).await?, old_time);

    db.close().await?;

    Ok(())
}

#[tokio::test]
async fn refresh_publishes_complete_scores_from_visits_and_votes() -> Result<()>
{
    let db = isolated_snapshot().await?;
    db.execute_unprepared(
        "CREATE TEMP TABLE user_collection (LIKE public.user_collection INCLUDING ALL);
         CREATE TEMP TABLE user_collection_item (LIKE public.user_collection_item INCLUDING ALL);
         CREATE TEMP TABLE release_tag_vote (LIKE public.release_tag_vote INCLUDING ALL);
         CREATE TEMP TABLE artist_tag_vote (LIKE public.artist_tag_vote INCLUDING ALL);
         CREATE TEMP TABLE song_tag_vote (LIKE public.song_tag_vote INCLUDING ALL);",
    )
    .await?;

    let config = Config::from_url(&infra_testing::test_redis_url())?;
    let redis = Pool::new(config, None, None, None, 1)?;
    redis.init().await?;

    let day = Utc::now().date_naive();
    let first_id =
        1_000_000_000 + i32::try_from(Utc::now().timestamp_subsec_nanos())?;
    let count = i32::try_from(RANKING_LIMIT + 1)?;
    let ids = first_id..first_id + count;
    let old_id = ids.end;
    let old_time = DateTime::from_timestamp(1_700_000_000, 0)
        .context("valid old snapshot timestamp")?;

    let result: Result<()> = async {
        store_scores(
            &db,
            &[(
                PopularityEntity {
                    kind: PopularityEntityKind::Release,
                    id: old_id,
                },
                0.9,
            )],
            old_time,
        )
        .await?;

        for id in ids.clone() {
            visit_core::record(
                &redis,
                EntityType::Release,
                id,
                &format!("visitor-{id}"),
                day,
            )
            .await?;
        }

        release_tag_vote::ActiveModel {
            release_id: Set(first_id),
            tag_id: Set(1),
            user_id: Set(1),
            score: Set(1),
            voted_at: Set(day
                .and_time(chrono::NaiveTime::MIN)
                .and_utc()
                .into()),
        }
        .insert(&db)
        .await?;

        refresh_scores(&db, &redis).await?;

        let scores: BTreeMap<_, _> = entity_popularity::Entity::find()
            .filter(entity_popularity::Column::EntityType.eq("release"))
            .filter(
                entity_popularity::Column::EntityId.between(first_id, old_id),
            )
            .all(&db)
            .await?
            .into_iter()
            .map(|score| (score.entity_id, score.score))
            .collect();
        assert_eq!(
            scores.keys().copied().collect::<Vec<_>>(),
            ids.clone().collect::<Vec<_>>()
        );
        assert!(scores[&first_id] > scores[&(first_id + 1)]);

        let ranking = load_ranking(&db).await?;
        assert!(scores.keys().any(|id| !ranking.release_ids.contains(id)));
        assert!(snapshot_time(&db).await? > old_time);

        Ok(())
    }
    .await;

    let cleanup: Result<()> = async {
        let prefix = format!("popular:{{release}}:{day}");
        redis
            .del::<(), _>(
                ids.clone()
                    .map(|id| format!("{prefix}:{id}"))
                    .collect::<Vec<_>>(),
            )
            .await?;
        redis
            .srem::<(), _, _>(
                format!("{prefix}:active"),
                ids.collect::<Vec<_>>(),
            )
            .await?;

        Ok(())
    }
    .await;
    let redis_closed = redis.quit().await.context("close test Redis pool");
    let db_closed = db.close().await.context("close test database");

    result.and(cleanup).and(redis_closed).and(db_closed)
}

#[tokio::test]
async fn tag_voters_are_counted_once_for_each_entity_kind() -> Result<()> {
    let db = infra_testing::test_connection().await;
    let tx = db.begin().await?;
    let day = chrono::NaiveDate::from_ymd_opt(2024, 1, 15)
        .context("valid vote day")?;
    let voted_at = day
        .and_hms_opt(12, 0, 0)
        .context("valid vote timestamp")?
        .and_utc()
        .to_rfc3339();

    tx.execute_unprepared(&format!(
        "CREATE TEMP TABLE user_collection (LIKE public.user_collection INCLUDING ALL) ON COMMIT DROP;
         CREATE TEMP TABLE user_collection_item (LIKE public.user_collection_item INCLUDING ALL) ON COMMIT DROP;
         CREATE TEMP TABLE release_tag_vote (LIKE public.release_tag_vote INCLUDING ALL) ON COMMIT DROP;
         CREATE TEMP TABLE artist_tag_vote (LIKE public.artist_tag_vote INCLUDING ALL) ON COMMIT DROP;
         CREATE TEMP TABLE song_tag_vote (LIKE public.song_tag_vote INCLUDING ALL) ON COMMIT DROP;
         INSERT INTO release_tag_vote (release_id, tag_id, user_id, score, voted_at) VALUES
             (7, 1, 1, 1, '{voted_at}'), (7, 2, 1, 1, '{voted_at}');
         INSERT INTO artist_tag_vote (artist_id, tag_id, user_id, score, voted_at) VALUES
             (7, 1, 1, 1, '{voted_at}'), (7, 1, 2, 1, '{voted_at}'),
             (7, 2, 1, 1, '{voted_at}');
         INSERT INTO song_tag_vote (song_id, tag_id, user_id, score, voted_at) VALUES
             (7, 1, 1, 1, '{voted_at}'), (7, 1, 2, 1, '{voted_at}'),
             (7, 1, 3, 1, '{voted_at}'), (7, 2, 1, 1, '{voted_at}');"
    )).await?;

    let counts = participation::counts(&tx, day, day).await?;

    assert_eq!(counts.len(), 3);

    for (kind, expected) in [
        (PopularityEntityKind::Release, 1),
        (PopularityEntityKind::Artist, 2),
        (PopularityEntityKind::Song, 3),
    ] {
        assert_eq!(
            counts
                .get(&PopularityEntity { kind, id: 7 })
                .context("entity participation should exist")?
                .voter_count,
            expected,
        );
    }

    tx.rollback().await?;

    Ok(())
}
