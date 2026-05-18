#![expect(
    clippy::missing_errors_doc,
    clippy::must_use_candidate,
    reason = "worker infrastructure exposes small framework helpers"
)]

use std::error::Error as StdError;
use std::future::Future;
use std::time::Duration;

pub use apalis::layers::WorkerBuilderExt;
pub use apalis::prelude::{
    Attempt, Data, Monitor, Request, Storage, TaskId, WorkerBuilder,
    WorkerFactoryFn,
};
pub use apalis_cron::{CronStream, Schedule};
use apalis_redis::{Config as RedisConfig, connect};
pub use apalis_redis::{RedisContext, RedisStorage};
use serde::Serialize;
use serde::de::DeserializeOwned;

pub type WorkerError = Box<dyn StdError + Send + Sync>;
pub type RedisQueue<T> = RedisStorage<T>;

#[derive(Clone, Copy, Debug)]
pub struct RedisQueueConfig {
    namespace: &'static str,
    enqueue_scheduled_interval: Duration,
}

impl RedisQueueConfig {
    pub const fn new(
        namespace: &'static str,
        enqueue_scheduled_interval: Duration,
    ) -> Self {
        Self {
            namespace,
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
        .set_namespace(config.namespace)
        .set_enqueue_scheduled(config.enqueue_scheduled_interval);
    Ok(RedisStorage::new_with_config(conn, config))
}

pub async fn reschedule_job<T>(
    queue: &mut RedisQueue<T>,
    job: T,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
    delay: Duration,
) -> Result<(), WorkerError>
where
    T: Serialize + DeserializeOwned + Send + Sync + Unpin + 'static,
{
    let mut request = Request::new_with_ctx(job, context);
    request.parts.task_id = task_id;
    request.parts.attempt = Attempt::new_with_value(attempt.current() + 1);
    queue.reschedule(request, delay).await?;
    Ok(())
}

pub fn spawn_monitor<F, E>(monitor: F, target: &'static str)
where
    F: Future<Output = Result<(), E>> + Send + 'static,
    E: std::fmt::Display,
{
    tokio::spawn(async move {
        if let Err(err) = monitor.await {
            log::error!(
                target: target,
                "worker monitor stopped: {err}"
            );
        }
    });
}
