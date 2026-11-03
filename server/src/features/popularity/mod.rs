use std::str::FromStr;
use std::time::Duration;

use apalis::layers::retry::backoff::{ExponentialBackoffMaker, MakeBackoff};
use apalis::layers::retry::{HasherRng, RetryPolicy};
use infra_worker::{
    AttemptLayer, CronStream, Data, Monitor, RunLayer, Schedule, TaskOutcome,
    WorkerBuilder, WorkerBuilderExt, WorkerFactoryFn, retryable_error,
};

use crate::infra::state::AppState;

pub(crate) const JOB_NAME: &str = "popular_ranking_refresh";
const RETRIES: usize = 2;

pub(crate) fn register_workers(monitor: Monitor, state: AppState) -> Monitor {
    let retry_backoff = ExponentialBackoffMaker::new(
        Duration::from_secs(10),
        Duration::from_secs(60),
        0.5,
        HasherRng::default(),
    )
    .expect("popularity refresh retry backoff")
    .make_backoff();

    monitor.register(
        WorkerBuilder::new(JOB_NAME)
            .data(state)
            .concurrency(1)
            .layer(RunLayer)
            .retry(RetryPolicy::retries(RETRIES).with_backoff(retry_backoff))
            .layer(AttemptLayer::new())
            .backend(CronStream::new(
                Schedule::from_str("0 0 * * * *")
                    .expect("hourly popular refresh schedule"),
            ))
            .build_fn(handle),
    )
}

async fn handle(
    _job: (),
    state: Data<AppState>,
) -> Result<TaskOutcome, infra_worker::Error> {
    let calculated_at = chrono::Utc::now();
    popularity_core::refresh_scores(&state.database, &state.redis_pool())
        .await
        .map_err(retryable_error)?;
    log::info!(target: "features.popularity", calculated_at:%;
        "popularity scores refreshed");
    Ok(TaskOutcome::Completed)
}
