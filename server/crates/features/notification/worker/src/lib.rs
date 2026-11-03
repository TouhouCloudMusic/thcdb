use std::num::NonZeroU16;
use std::str::FromStr;

use infra_db::SeaOrmRepository;
use infra_worker::{
    AttemptLayer, CronStream, Data, Monitor, RunLayer, Schedule, TaskOutcome,
    WorkerBuilder, WorkerFactoryFn, retryable_error,
};

pub const JOB_NAME: &str = "notification_cleanup";

pub fn register_workers(
    monitor: Monitor,
    repo: SeaOrmRepository,
    retention_days: NonZeroU16,
) -> Monitor {
    monitor.register(
        WorkerBuilder::new(JOB_NAME)
            .data(repo)
            .data(retention_days)
            .layer(RunLayer)
            .layer(AttemptLayer::new())
            .backend(CronStream::new(
                Schedule::from_str("0 0 0 * * *")
                    .expect("notification cleanup schedule"),
            ))
            .build_fn(
                |_job: (),
                 repo: Data<SeaOrmRepository>,
                 retention_days: Data<NonZeroU16>| async move {
                    notification_cleanup::run(&repo.conn, *retention_days)
                        .await
                        .map_err(retryable_error)?;
                    Ok::<_, infra_worker::Error>(TaskOutcome::Completed)
                },
            ),
    )
}
