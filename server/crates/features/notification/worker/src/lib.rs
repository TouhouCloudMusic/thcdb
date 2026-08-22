use std::num::NonZeroU16;
use std::str::FromStr;

use infra_db::SeaOrmRepository;
use infra_worker::{
    CronStream, Data, Monitor, Schedule, WorkerBuilder, WorkerBuilderExt,
    WorkerFactoryFn,
};

pub fn register_workers(
    monitor: Monitor,
    repo: SeaOrmRepository,
    retention_days: NonZeroU16,
) -> Monitor {
    monitor.register(
        WorkerBuilder::new("notification_cleanup")
            .data(repo)
            .data(retention_days)
            .enable_tracing()
            .backend(CronStream::new(
                Schedule::from_str("0 0 0 * * *")
                    .expect("notification cleanup schedule"),
            ))
            .build_fn(
                |_job: (),
                 repo: Data<SeaOrmRepository>,
                 retention_days: Data<NonZeroU16>| async move {
                    notification_cleanup::run(&repo.conn, *retention_days).await
                },
            ),
    )
}
