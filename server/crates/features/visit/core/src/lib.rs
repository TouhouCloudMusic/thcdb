use chrono::{Days, NaiveDate, NaiveTime};
use fred::prelude::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

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
}

impl EntityType {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Release => "release",
            Self::Artist => "artist",
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

pub async fn counts(
    redis: &Pool,
    entity_type: EntityType,
    day: NaiveDate,
) -> Result<Vec<(i32, u64)>, Error> {
    let days: Vec<_> = (0..7)
        .map(|offset| day_key(entity_type, day - Days::new(offset)))
        .collect();
    let ids: Vec<i32> = redis
        .sunion(
            days.iter()
                .map(|key| format!("{key}:active"))
                .collect::<Vec<_>>(),
        )
        .await?;
    let mut result = Vec::with_capacity(ids.len());
    for chunk in ids.chunks(200) {
        let pipeline = redis.next().pipeline();
        for id in chunk {
            pipeline
                .pfcount::<(), _>(
                    days.iter()
                        .map(|key| format!("{key}:{id}"))
                        .collect::<Vec<_>>(),
                )
                .await?;
        }
        let counts: Vec<u64> = pipeline.all().await?;
        result.extend(chunk.iter().copied().zip(counts));
    }
    Ok(result)
}
