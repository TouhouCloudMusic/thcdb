use chrono::{Days, NaiveDate, NaiveTime};
use fred::prelude::*;
use itertools::izip;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[cfg(all(test, feature = "integration-test"))]
mod integration_tests;

#[derive(
    Clone,
    Copy,
    Debug,
    Deserialize,
    Serialize,
    ToSchema,
    PartialEq,
    Eq,
    PartialOrd,
    Ord,
)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Release,
    Artist,
    Song,
}

impl EntityType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Release => "release",
            Self::Artist => "artist",
            Self::Song => "song",
        }
    }
}

fn day_key(entity_type: EntityType, day: NaiveDate) -> String {
    format!("popular:{{{}}}:{}", entity_type.as_str(), day)
}

pub async fn record(
    redis: &Pool,
    entity_type: EntityType,
    id: i32,
    visitor: &str,
    day: NaiveDate,
) -> Result<(), Error> {
    let prefix = day_key(entity_type, day);
    let expires =
        day.and_time(NaiveTime::MIN).and_utc().timestamp() + 8 * 86_400;
    let visitors_key = format!("{prefix}:{id}");
    let active_key = format!("{prefix}:active");
    let transaction = redis.next().multi();
    transaction
        .pfadd::<(), _, _>(&visitors_key, visitor)
        .await?;
    transaction.sadd::<(), _, _>(&active_key, id).await?;
    transaction
        .expire_at::<(), _>(&visitors_key, expires, None)
        .await?;
    transaction
        .expire_at::<(), _>(&active_key, expires, None)
        .await?;
    transaction.exec::<(i64, i64, i64, i64)>(true).await?;
    Ok(())
}

const COUNT_BATCH_SIZE: usize = 200;

pub struct VisitCount {
    pub kind: EntityType,
    pub id: i32,
    pub visitors: u64,
}

pub async fn counts(
    redis: &Pool,
    day: NaiveDate,
) -> Result<Vec<VisitCount>, Error> {
    let kinds = [EntityType::Release, EntityType::Artist, EntityType::Song];
    let days = kinds.map(|kind| {
        (0..7)
            .map(|offset| day_key(kind, day - Days::new(offset)))
            .collect::<Vec<_>>()
    });
    let pipeline = redis.next().pipeline();

    for keys in &days {
        pipeline
            .sunion::<(), _>(
                keys.iter()
                    .map(|key| format!("{key}:active"))
                    .collect::<Vec<_>>(),
            )
            .await?;
    }

    let groups: Vec<Vec<i32>> = pipeline.all().await?;

    let entities: Vec<_> = izip!(kinds, &days, groups)
        .flat_map(|(kind, days, ids)| {
            ids.into_iter().map(move |id| (kind, id, days))
        })
        .collect();

    let mut result = Vec::with_capacity(entities.len());

    for chunk in entities.chunks(COUNT_BATCH_SIZE) {
        let pipeline = redis.next().pipeline();

        for (_, id, days) in chunk {
            pipeline
                .pfcount::<(), _>(
                    days.iter()
                        .map(|day| format!("{day}:{id}"))
                        .collect::<Vec<_>>(),
                )
                .await?;
        }

        let counts: Vec<u64> = pipeline.all().await?;

        result.extend(chunk.iter().zip(counts).map(
            |(&(kind, id, _), visitors)| VisitCount { kind, id, visitors },
        ));
    }

    Ok(result)
}
