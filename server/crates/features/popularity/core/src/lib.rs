use std::collections::BTreeMap;

use chrono::{Days, Utc};
use fred::prelude::{Expiration, KeysInterface, Pool};
use futures_util::TryFutureExt;
use infra_error::{ContextError, ResultExt};
use sea_orm::ConnectionTrait;
use serde::{Deserialize, Serialize};
use visit_core::EntityType;

use self::scoring::Metrics;

mod participation;
mod scoring;

const RANKING_LIMIT: usize = 6;

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
enum PopularityEntity {
    Release(i32),
    Artist(i32),
}

#[derive(Clone, Copy)]
enum PopularityEntityKind {
    Release,
    Artist,
}

impl PopularityEntity {
    const fn id(self) -> i32 {
        match self {
            Self::Release(id) | Self::Artist(id) => id,
        }
    }
}

#[derive(Default, Deserialize, Serialize)]
pub struct Ranking {
    pub release_ids: Vec<i32>,
    pub artist_ids: Vec<i32>,
}

pub async fn load_ranking(
    db: &impl ConnectionTrait,
    redis: &Pool,
) -> Result<Ranking, ContextError> {
    let key = format!("popular:ranking:v1:{}", Utc::now().timestamp() / 3600);

    match redis
        .get::<Option<String>, _>(key)
        .await
        .context("read popularity ranking cache")?
    {
        Some(cached) => serde_json::from_str(&cached)
            .context("decode popularity ranking cache"),
        None => compute_ranking(db, redis).await,
    }
}

pub async fn compute_ranking(
    db: &impl ConnectionTrait,
    redis: &Pool,
) -> Result<Ranking, ContextError> {
    let now = Utc::now();
    let day = now.date_naive();

    let (releases, artists, participants) = tokio::try_join!(
        visit_core::counts(redis, EntityType::Release, day).map_err(|source| {
            ContextError::new("load release visit counts", source)
        }),
        visit_core::counts(redis, EntityType::Artist, day).map_err(|source| {
            ContextError::new("load artist visit counts", source)
        }),
        participation::counts(db, day - Days::new(6), day).map_err(|source| {
            ContextError::new("load popularity participation counts", source)
        }),
    )?;

    let mut metrics = BTreeMap::new();
    for (id, visitors) in releases {
        metrics
            .entry(PopularityEntity::Release(id))
            .or_insert_with(Metrics::default)
            .visitors = visitors;
    }
    for (id, visitors) in artists {
        metrics
            .entry(PopularityEntity::Artist(id))
            .or_insert_with(Metrics::default)
            .visitors = visitors;
    }

    for (entity, counts) in participants {
        let entry = metrics.entry(entity).or_insert_with(Metrics::default);

        entry.collector_count = counts.collector_count;
        entry.voter_count = counts.voter_count;
    }

    let mut items = scoring::score_batch(metrics);
    items.retain(|(_, score)| *score > 0.0);

    items.sort_by(|(left_entity, left_score), (right_entity, right_score)| {
        right_score
            .total_cmp(left_score)
            .then_with(|| left_entity.id().cmp(&right_entity.id()))
    });

    let mut ranking = Ranking::default();
    for (entity, _) in items {
        let ids = match entity {
            PopularityEntity::Release(_) => &mut ranking.release_ids,
            PopularityEntity::Artist(_) => &mut ranking.artist_ids,
        };

        if ids.len() < RANKING_LIMIT {
            ids.push(entity.id());
        }
    }

    let cached = serde_json::to_string(&ranking)
        .context("encode popularity ranking cache")?;

    redis
        .set::<(), _, _>(
            format!("popular:ranking:v1:{}", now.timestamp() / 3600),
            cached,
            Some(Expiration::EX(3600)),
            None,
            false,
        )
        .await
        .context("write popularity ranking cache")?;

    Ok(ranking)
}
