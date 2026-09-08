use std::str::FromStr;

use infra_worker::{
    CronStream, Data, Monitor, Schedule, WorkerBuilder, WorkerFactoryFn,
};

use crate::infra::state::AppState;

pub(crate) fn register_workers(monitor: Monitor, state: AppState) -> Monitor {
    monitor.register(
        WorkerBuilder::new("popular_ranking_refresh")
            .data(state)
            .backend(CronStream::new(
                Schedule::from_str("0 0 * * * *")
                    .expect("hourly popular refresh schedule"),
            ))
            .build_fn(|_job: (), state: Data<AppState>| async move {
                Box::pin(popularity_core::compute_ranking(
                    &state.database,
                    &state.redis_pool(),
                ))
                .await
                .map(|_| ())
            }),
    )
}
