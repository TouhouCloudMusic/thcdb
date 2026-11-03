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
use infra_error::BoxedError;
use serde::Serialize;
use serde::de::DeserializeOwned;

mod observation;
mod reporting;

#[cfg(test)]
mod tests;

pub use observation::{AttemptLayer, RunLayer};
pub use reporting::report_backend_error;

/// Business result; every variant permits the backend to acknowledge the task.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskOutcome {
    /// Processing completed successfully.
    Completed,
    /// Processing is no longer needed.
    Skipped,
    /// Processing failed, but the task should be consumed without retrying.
    Discarded,
}

pub type WorkerError = BoxedError;
pub type RedisQueue<T> = RedisStorage<T>;

pub fn retryable_error(source: impl Into<WorkerError>) -> Error {
    Error::Failed(Arc::new(source.into()))
}

pub fn permanent_error(source: impl Into<WorkerError>) -> Error {
    Error::Abort(Arc::new(source.into()))
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
