use std::sync::LazyLock;
use std::time::Duration;

use prometheus_client::encoding::EncodeLabelSet;
use prometheus_client::registry::Registry;

use crate::metrics::{Durations, request_and_processing_duration_histogram};

#[derive(Clone, Debug, Hash, PartialEq, Eq, EncodeLabelSet)]
struct WorkerLabels {
    job: String,
    outcome: &'static str,
}

static DURATION: LazyLock<Durations<WorkerLabels>> = LazyLock::new(|| {
    Durations::new_with_constructor(request_and_processing_duration_histogram)
});

pub(super) fn register(registry: &mut Registry) {
    registry.register(
        "thcdb_worker_job_duration_seconds",
        "Worker attempt duration by business outcome",
        DURATION.clone(),
    );
}

pub fn observe_worker(job: &str, outcome: &'static str, elapsed: Duration) {
    DURATION
        .get_or_create(&WorkerLabels {
            job: job.to_owned(),
            outcome,
        })
        .observe(elapsed.as_secs_f64());
}
