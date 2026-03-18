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
    tracing::info!("Deleting file: {}", job.path);
    match tokio::fs::remove_file(&job.path).await {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => {
            tracing::error!("Failed to delete {}: {}", job.path, err);
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
                tracing::error!(
                    error = ?push_err,
                    path,
                    "Failed to reschedule remove file job"
                );
                std::io::Error::other(push_err.to_string())
            })
        }
    }
}
