use std::path::Path;
use std::time::Duration;

use infra_storage::DeferredDelete;
use infra_worker::{
    Attempt, Data, RedisContext, RedisQueue, RedisQueueConfig, Storage, TaskId,
    WorkerError, reschedule_job,
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
pub struct WorkerState {
    pub queue: RemoveFileQueue,
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
    async fn defer_delete(&self, path: &Path) -> Result<(), std::io::Error> {
        let path = path
            .to_str()
            .ok_or_else(|| {
                std::io::Error::other("Failed to serialize pathbuf")
            })?
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
) -> Result<(), std::io::Error> {
    let job = RemoveFileJob { path };
    let mut attempt = 0;

    loop {
        let mut queue = queue.clone();
        match queue.push(job.clone()).await {
            Ok(_task_id) => return Ok(()),
            Err(err) => {
                attempt += 1;
                if attempt > retries {
                    return Err(std::io::Error::other(err.to_string()));
                }
                tokio::time::sleep(DEFERRED_DELETE_DELAY).await;
            }
        }
    }
}

pub async fn handle(
    job: RemoveFileJob,
    state: Data<WorkerState>,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
) -> Result<(), std::io::Error> {
    log::info!(
        target: "infra.storage.remove_file_worker",
        path = job.path.as_str();
        "deleting file"
    );
    match tokio::fs::remove_file(&job.path).await {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => {
            log::error!(
                target: "infra.storage.remove_file_worker",
                path = job.path.as_str(),
                error:% = err;
                "failed to delete file"
            );
            let path = job.path.clone();
            let mut queue = state.queue.clone();
            reschedule_job(
                &mut queue,
                job,
                task_id,
                attempt,
                context,
                Duration::from_secs(1),
            )
            .await
            .map_err(|push_err| {
                log::error!(
                    target: "infra.storage.remove_file_worker",
                    path = path.as_str(),
                    error:? = push_err;
                    "failed to reschedule remove file job"
                );
                std::io::Error::other(push_err.to_string())
            })
        }
    }
}
