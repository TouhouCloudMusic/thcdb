use std::ops::Range;

use anyhow::{Result, ensure};
use chrono::{Days, NaiveDate, Utc};
use fred::prelude::*;

use super::{COUNT_BATCH_SIZE, EntityType, counts, day_key, record};

async fn redis_pool() -> Result<Pool> {
    let config = Config::from_url(&infra_testing::test_redis_url())?;
    let pool = Pool::new(config, None, None, None, 1)?;
    pool.init().await?;

    Ok(pool)
}

async fn clear_visits(
    redis: &Pool,
    day: NaiveDate,
    ids: Range<i32>,
) -> Result<()> {
    let pipeline = redis.next().pipeline();

    for kind in [EntityType::Release, EntityType::Artist, EntityType::Song] {
        for offset in 0..8 {
            let prefix = day_key(kind, day - Days::new(offset));

            pipeline
                .del::<(), _>(
                    ids.clone()
                        .map(|id| format!("{prefix}:{id}"))
                        .collect::<Vec<_>>(),
                )
                .await?;
            pipeline
                .srem::<(), _, _>(
                    format!("{prefix}:active"),
                    ids.clone().collect::<Vec<_>>(),
                )
                .await?;
        }
    }

    pipeline.all::<()>().await?;

    Ok(())
}

#[tokio::test]
async fn visitor_counts_preserve_entity_identity_across_batches() -> Result<()>
{
    let redis = redis_pool().await?;
    let day = Utc::now().date_naive() + Days::new(1);
    let kinds = [
        (EntityType::Release, 1_u64),
        (EntityType::Artist, 2),
        (EntityType::Song, 3),
    ];
    let count_per_kind = i32::try_from(COUNT_BATCH_SIZE / kinds.len() + 1)?;
    let first_id = rand::random_range(1_000_000..1_000_000_000);
    let ids = first_id..first_id + count_per_kind;

    let result = async {
        let mut expected = Vec::new();

        for (kind, base_count) in kinds {
            for id in ids.clone() {
                let visitors =
                    1 + (base_count + u64::try_from(id - first_id)?) % 3;

                for visitor in 0..visitors {
                    record(
                        &redis,
                        kind,
                        id,
                        &format!("visitor-{visitor}"),
                        day,
                    )
                    .await?;
                }

                expected.push((kind, id, visitors));
            }
        }

        let mut actual: Vec<_> = counts(&redis, day)
            .await?
            .into_iter()
            .filter(|count| ids.contains(&count.id))
            .map(|count| (count.kind, count.id, count.visitors))
            .collect();
        actual.sort_unstable();
        expected.sort_unstable();

        ensure!(actual == expected, "batched counts differ: {actual:?}");

        Ok(())
    }
    .await;

    let cleanup = clear_visits(&redis, day, ids).await;
    redis.quit().await?;

    result.and(cleanup)
}

#[tokio::test]
async fn visitor_counts_deduplicate_visitors_within_the_inclusive_seven_day_window()
-> Result<()> {
    let redis = redis_pool().await?;
    let day = Utc::now().date_naive() + Days::new(1);
    let id = rand::random_range(1_000_000..1_000_000_000);
    let ids = id..id + 2;

    let result = async {
        for (entity_id, visitor, offset) in [
            (id, "returning", 0),
            (id, "returning", 6),
            (id, "today", 0),
            (id, "six-days-ago", 6),
            (id, "outside-window", 7),
            (id + 1, "outside-window-only", 7),
        ] {
            record(
                &redis,
                EntityType::Song,
                entity_id,
                visitor,
                day - Days::new(offset),
            )
            .await?;
        }

        let actual: Vec<_> = counts(&redis, day)
            .await?
            .into_iter()
            .filter(|count| ids.contains(&count.id))
            .map(|count| (count.kind, count.id, count.visitors))
            .collect();

        ensure!(
            actual == [(EntityType::Song, id, 3)],
            "unexpected seven-day counts: {actual:?}"
        );

        Ok(())
    }
    .await;

    let cleanup = clear_visits(&redis, day, ids).await;
    redis.quit().await?;

    result.and(cleanup)
}
