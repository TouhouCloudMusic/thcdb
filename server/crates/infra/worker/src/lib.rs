use std::error::Error as StdError;
use std::sync::Arc;
use std::time::Duration;

pub use apalis::layers::WorkerBuilderExt;
pub use apalis::prelude::{
    Attempt, Data, Error, Event, Monitor, Ready, Request, Storage, TaskId,
    Worker, WorkerBuilder, WorkerFactoryFn,
};
pub use apalis_cron::{CronStream, Schedule};
use apalis_redis::{Config as RedisConfig, connect};
pub use apalis_redis::{RedisContext, RedisStorage};
use serde::Serialize;
use serde::de::DeserializeOwned;

pub type WorkerError = Box<dyn StdError + Send + Sync>;
pub type RedisQueue<T> = RedisStorage<T>;

pub fn retryable_error<E>(source: E) -> Error
where
    E: StdError + Send + Sync + 'static,
{
    Error::Failed(Arc::new(Box::new(source) as WorkerError))
}

pub fn permanent_error<E>(source: E) -> Error
where
    E: StdError + Send + Sync + 'static,
{
    Error::Abort(Arc::new(Box::new(source) as WorkerError))
}

#[derive(Clone, Debug)]
pub struct RedisQueueConfig {
    namespace: String,
    enqueue_scheduled_interval: Duration,
}

impl RedisQueueConfig {
    pub fn new(
        namespace: impl Into<String>,
        enqueue_scheduled_interval: Duration,
    ) -> Self {
        Self {
            namespace: namespace.into(),
            enqueue_scheduled_interval,
        }
    }
}

pub async fn redis_queue<T>(
    redis_url: &str,
    config: RedisQueueConfig,
) -> Result<RedisQueue<T>, WorkerError>
where
    T: Serialize + DeserializeOwned,
{
    let conn = connect(redis_url).await?;

    let config = RedisConfig::default()
        .set_namespace(&config.namespace)
        .set_enqueue_scheduled(config.enqueue_scheduled_interval);

    Ok(RedisStorage::new_with_config(conn, config))
}
