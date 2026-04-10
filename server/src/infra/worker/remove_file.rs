use std::time::Duration;

use apalis::prelude::{Attempt, Data, TaskId};
use apalis_redis::RedisContext;
use serde::{Deserialize, Serialize};

use crate::infra::worker::{WorkerState, reschedule_job};

pub(crate) type RemoveFileQueue = apalis_redis::RedisStorage<RemoveFileJob>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub(crate) struct RemoveFileJob {
    pub path: String,
}

pub(super) async fn handle(
    job: RemoveFileJob,
    state: Data<WorkerState>,
    task_id: TaskId,
    attempt: Attempt,
    context: RedisContext,
) -> Result<(), std::io::Error> {
    log::info!(
        target: "infra.worker.remove_file",
        path = job.path.as_str();
        "deleting file"
    );
    match tokio::fs::remove_file(&job.path).await {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => {
            log::error!(
                target: "infra.worker.remove_file",
                path = job.path.as_str(),
                error:% = err;
                "failed to delete file"
            );
            let path = job.path.clone();
            let mut queue = state.remove_file_queue.clone();
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
                    target: "infra.worker.remove_file",
                    path = path.as_str(),
                    error:? = push_err;
                    "failed to reschedule remove file job"
                );
                std::io::Error::other(push_err.to_string())
            })
        }
    }
}
