use std::str::FromStr;

use chrono::Utc;
use infra_db::SeaOrmRepository;
use infra_worker::{
    AttemptLayer, CronStream, Data, Monitor, RunLayer, Schedule, TaskOutcome,
    WorkerBuilder, WorkerFactoryFn, retryable_error,
};

mod repo;

pub const JOB_NAME: &str = "unverified_user_cleanup";

pub(super) fn register_worker(
    monitor: Monitor,
    repository: SeaOrmRepository,
) -> Monitor {
    monitor.register(
        WorkerBuilder::new(JOB_NAME)
            .data(repository)
            .layer(RunLayer)
            .layer(AttemptLayer::new())
            .backend(CronStream::new(
                Schedule::from_str("0 0 * * * *")
                    .expect("unverified user cleanup schedule"),
            ))
            .build_fn(handle),
    )
}

async fn handle(
    _job: (),
    repository: Data<SeaOrmRepository>,
) -> Result<TaskOutcome, infra_worker::Error> {
    let cutoff = (Utc::now() - chrono::Duration::hours(24)).into();
    let deleted =
        repo::delete_expired_unverified_users(&repository.conn, cutoff)
            .await
            .map_err(retryable_error)?;
    if deleted > 0 {
        log::info!(
            target: "features.auth.sign_up.cleanup",
            deleted;
            "expired unverified users deleted"
        );
    }
    Ok(TaskOutcome::Completed)
}
