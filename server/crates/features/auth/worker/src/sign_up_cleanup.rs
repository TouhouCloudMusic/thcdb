use std::str::FromStr;

use chrono::Utc;
use infra_db::SeaOrmRepository;
use infra_worker::{
    CronStream, Data, Monitor, Schedule, WorkerBuilder, WorkerBuilderExt,
    WorkerFactoryFn,
};

mod repo;

pub(super) fn register_worker(
    monitor: Monitor,
    repository: SeaOrmRepository,
) -> Monitor {
    monitor.register(
        WorkerBuilder::new("unverified_user_cleanup")
            .data(repository)
            .enable_tracing()
            .backend(CronStream::new(
                Schedule::from_str("0 0 * * * *")
                    .expect("unverified user cleanup schedule"),
            ))
            .build_fn(handle),
    )
}

async fn handle(_job: (), repository: Data<SeaOrmRepository>) {
    let cutoff: chrono::DateTime<chrono::FixedOffset> =
        (Utc::now() - chrono::Duration::hours(24)).into();

    match repo::delete_expired_unverified_users(&repository.conn, cutoff).await
    {
        Ok(deleted) => {
            if deleted > 0 {
                log::info!(
                    target: "features.auth.sign_up.cleanup",
                    deleted;
                    "expired unverified users deleted"
                );
            }
        }
        Err(err) => {
            log::error!(
                target: "features.auth.sign_up.cleanup",
                error:% = err;
                "failed to delete expired unverified users"
            );
        }
    }
}
