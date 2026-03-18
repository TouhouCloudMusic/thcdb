use std::error::Error as StdError;
use std::time::Duration;

use apalis::prelude::*;
use apalis_cron::CronStream;
use apalis_redis::{
    Config as RedisConfig, RedisContext, RedisStorage, connect,
};
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::features::auth::password_reset::{
    PASSWORD_RESET_EMAIL_KEY, PasswordResetEmailJob,
};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::email::Mailer;
use crate::infra::storage::file::REMOVE_FILE_STREAM_KEY;

mod notification_cleanup;
mod password_reset_email;
mod remove_file;
mod unverified_user_cleanup;

pub(crate) use self::remove_file::{RemoveFileJob, RemoveFileQueue};

pub(crate) type PasswordResetEmailQueue = RedisStorage<PasswordResetEmailJob>;

#[derive(Clone)]
pub(crate) struct WorkerState {
    pub(crate) redis_pool: fred::prelude::Pool,
    pub(crate) repo: SeaOrmRepository,
    pub(crate) mailer: Mailer,
    pub(crate) notification_retention_days: i64,
    pub(crate) password_reset_email_queue: PasswordResetEmailQueue,
    pub(crate) remove_file_queue: RemoveFileQueue,
}

pub struct Worker {
    pub redis_pool: fred::prelude::Pool,
    pub repo: SeaOrmRepository,
    pub mailer: Mailer,
    pub notification_retention_days: i64,
    pub password_reset_email_queue: PasswordResetEmailQueue,
    pub remove_file_queue: RemoveFileQueue,
}

pub(crate) async fn password_reset_email_queue(
    redis_url: &str,
) -> Result<PasswordResetEmailQueue, Box<dyn StdError + Send + Sync>> {
    redis_queue(redis_url, PASSWORD_RESET_EMAIL_KEY, Duration::from_secs(1))
        .await
}

pub(crate) async fn remove_file_queue(
    redis_url: &str,
) -> Result<RemoveFileQueue, Box<dyn StdError + Send + Sync>> {
    redis_queue(redis_url, REMOVE_FILE_STREAM_KEY, Duration::from_secs(5)).await
}

async fn redis_queue<T: Serialize + DeserializeOwned>(
    redis_url: &str,
    namespace: &'static str,
    enqueue_scheduled_interval: Duration,
) -> Result<RedisStorage<T>, Box<dyn StdError + Send + Sync>> {
    let conn = connect(redis_url).await?;
    let config = RedisConfig::default()
        .set_namespace(namespace)
        .set_enqueue_scheduled(enqueue_scheduled_interval);
    Ok(RedisStorage::new_with_config(conn, config))
}

pub(super) async fn reschedule_job<T>(
    queue: &mut RedisStorage<T>,
    job: T,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
    delay: Duration,
) -> Result<(), Box<dyn StdError + Send + Sync>>
where
    T: Serialize + DeserializeOwned + Send + Sync + Unpin + 'static,
{
    let mut request = Request::new_with_ctx(job, context);
    request.parts.task_id = task_id;
    request.parts.attempt = Attempt::new_with_value(attempt.current() + 1);
    queue.reschedule(request, delay).await?;
    Ok(())
}

impl Worker {
    pub fn init(self) {
        let Self {
            redis_pool,
            repo,
            mailer,
            notification_retention_days,
            password_reset_email_queue,
            remove_file_queue,
        } = self;
        let shared = Data::new(WorkerState {
            redis_pool,
            repo,
            mailer,
            notification_retention_days,
            password_reset_email_queue: password_reset_email_queue.clone(),
            remove_file_queue: remove_file_queue.clone(),
        });

        let unverified_user_cleanup_state = shared.clone();
        tokio::spawn(async move {
            unverified_user_cleanup::handle(
                unverified_user_cleanup::UnverifiedUserCleanupJob,
                unverified_user_cleanup_state,
            )
            .await;
        });

        let notification_cleanup_state = shared.clone();
        tokio::spawn(async move {
            notification_cleanup::handle(
                notification_cleanup::NotificationCleanupJob,
                notification_cleanup_state,
            )
            .await;
        });

        let monitor = Monitor::new()
            .register(
                WorkerBuilder::new("remove_file")
                    .enable_tracing()
                    .data(shared.clone())
                    .backend(remove_file_queue)
                    .build_fn(remove_file::handle),
            )
            .register(
                WorkerBuilder::new("unverified_user_cleanup")
                    .enable_tracing()
                    .data(shared.clone())
                    .backend(CronStream::new(
                        unverified_user_cleanup::schedule(),
                    ))
                    .build_fn(unverified_user_cleanup::handle),
            )
            .register(
                WorkerBuilder::new("password_reset_email")
                    .enable_tracing()
                    .data(shared.clone())
                    .backend(password_reset_email_queue)
                    .build_fn(password_reset_email::handle),
            )
            .register(
                WorkerBuilder::new("notification_cleanup")
                    .enable_tracing()
                    .data(shared)
                    .backend(CronStream::new(notification_cleanup::schedule()))
                    .build_fn(notification_cleanup::handle),
            );

        tokio::spawn(async move {
            if let Err(err) = monitor.run().await {
                tracing::error!(error = %err, "Worker monitor stopped");
            }
        });
    }
}
