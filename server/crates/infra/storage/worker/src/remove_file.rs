use std::io::{self, ErrorKind};
use std::path::Path;
use std::time::Duration;

use apalis::layers::retry::backoff::{ExponentialBackoffMaker, MakeBackoff};
use apalis::layers::retry::{HasherRng, RetryPolicy};
use infra_storage::DeferredDelete;
use infra_worker::{
    Error, Monitor, RedisQueue, RedisQueueConfig, Storage, WorkerBuilder,
    WorkerBuilderExt, WorkerError, WorkerFactoryFn, permanent_error,
    retryable_error,
};
use serde::{Deserialize, Serialize};

const REMOVE_FILE_STREAM_KEY: &str = "storage:remove-file";
const DEFERRED_DELETE_DELAY: Duration = Duration::from_millis(500);
const DEFERRED_DELETE_RETRIES: u32 = 5;

pub type RemoveFileQueue = RedisQueue<RemoveFileJob>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RemoveFileJob {
    pub path: String,
}

#[derive(Clone)]
pub struct RemoveFileDeferredDelete {
    queue: RemoveFileQueue,
}

impl RemoveFileDeferredDelete {
    #[must_use]
    pub const fn new(queue: RemoveFileQueue) -> Self {
        Self { queue }
    }
}

impl DeferredDelete for RemoveFileDeferredDelete {
    async fn defer_delete(&self, path: &Path) -> Result<(), io::Error> {
        let path = path
            .to_str()
            .ok_or_else(|| io::Error::other("Failed to serialize pathbuf"))?
            .to_string();
        let queue = self.queue.clone();
        tokio::spawn(async move {
            if let Err(err) =
                retry_enqueue_delete(queue, path, DEFERRED_DELETE_RETRIES).await
            {
                log::error!(
                    target: "infra.storage.remove_file_worker",
                    error:% = err;
                    "failed to enqueue deferred file deletion"
                );
            }
        });
        Ok(())
    }
}

pub async fn queue(redis_url: &str) -> Result<RemoveFileQueue, WorkerError> {
    infra_worker::redis_queue(
        redis_url,
        RedisQueueConfig::new(REMOVE_FILE_STREAM_KEY, Duration::from_secs(5)),
    )
    .await
}

async fn retry_enqueue_delete(
    queue: RemoveFileQueue,
    path: String,
    retries: u32,
) -> Result<(), io::Error> {
    let job = RemoveFileJob { path };
    let mut attempt = 0;

    loop {
        let mut queue = queue.clone();
        match queue.push(job.clone()).await {
            Ok(_task_id) => return Ok(()),
            Err(err) => {
                attempt += 1;
                if attempt > retries {
                    return Err(io::Error::other(err.to_string()));
                }
                tokio::time::sleep(DEFERRED_DELETE_DELAY).await;
            }
        }
    }
}

pub async fn handle(job: RemoveFileJob) -> Result<(), Error> {
    log::info!(
        target: "infra.storage.remove_file_worker",
        path = job.path.as_str();
        "deleting file"
    );
    match tokio::fs::remove_file(&job.path).await {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == ErrorKind::NotFound => Ok(()),
        Err(err) => {
            log::error!(
                target: "infra.storage.remove_file_worker",
                path = job.path.as_str(),
                error:% = err;
                "failed to delete file"
            );
            Err(classify_failure(err))
        }
    }
}

fn classify_failure(error: io::Error) -> Error {
    if matches!(
        error.kind(),
        ErrorKind::PermissionDenied
            | ErrorKind::InvalidInput
            | ErrorKind::IsADirectory
            | ErrorKind::NotADirectory
            | ErrorKind::ReadOnlyFilesystem
            | ErrorKind::Unsupported
    ) {
        permanent_error(error)
    } else {
        retryable_error(error)
    }
}

pub fn register_workers(monitor: Monitor, queue: RemoveFileQueue) -> Monitor {
    let retry_backoff = ExponentialBackoffMaker::new(
        Duration::from_secs(1),
        Duration::from_secs(30),
        0.5,
        HasherRng::default(),
    )
    .expect("remove file retry backoff")
    .make_backoff();

    monitor.register(
        WorkerBuilder::new("remove_file")
            .retry(RetryPolicy::retries(4).with_backoff(retry_backoff))
            .enable_tracing()
            .backend(queue)
            .build_fn(handle),
    )
}
