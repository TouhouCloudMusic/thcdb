use std::str::FromStr;
use std::time::Duration;

use apalis::layers::retry::backoff::{ExponentialBackoffMaker, MakeBackoff};
use apalis::layers::retry::{HasherRng, RetryPolicy};
use infra_worker::{
    CronStream, Data, Monitor, Schedule, WorkerBuilder, WorkerBuilderExt,
    WorkerFactoryFn, retryable_error,
};

use crate::infra::state::AppState;

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
        WorkerBuilder::new("popular_ranking_refresh")
            .data(state)
            .concurrency(1)
            .retry(RetryPolicy::retries(2).with_backoff(retry_backoff))
            .enable_tracing()
            .backend(CronStream::new(
                Schedule::from_str("0 0 * * * *")
                    .expect("hourly popular refresh schedule"),
            ))
            .build_fn(|_job: (), state: Data<AppState>| async move {
                let calculated_at = chrono::Utc::now();

                popularity_core::refresh_scores(
                    &state.database,
                    &state.redis_pool(),
                )
                .await
                .inspect_err(|error| {
                    log::error!(target: "features.popularity", error:%;
                        "failed to refresh popularity scores; previous snapshot retained");
                })
                .map_err(retryable_error)?;

                log::info!(target: "features.popularity", calculated_at:%;
                    "popularity scores refreshed");

                Ok::<(), infra_worker::Error>(())
            }),
    )
}
