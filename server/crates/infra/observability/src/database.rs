use std::sync::LazyLock;
use std::time::Duration;

use prometheus_client::encoding::EncodeLabelSet;
use prometheus_client::metrics::histogram::Histogram;
use prometheus_client::registry::Registry;

use crate::metrics::Durations;
use crate::span::record_operation_result;

#[derive(Clone, Debug, Hash, PartialEq, Eq, EncodeLabelSet)]
struct QueryLabels {
    operation: &'static str,
    outcome: &'static str,
}

fn operation_duration_histogram() -> Histogram {
    // OpenTelemetry: db.client.operation.duration.
    Histogram::new([0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0])
}

static DURATION: LazyLock<Durations<QueryLabels>> = LazyLock::new(|| {
    Durations::new_with_constructor(operation_duration_histogram)
});

pub(super) fn register(registry: &mut Registry) {
    registry.register(
        "thcdb_db_operation_duration_seconds",
        "Database operation duration including connection acquisition",
        DURATION.clone(),
    );
}

pub fn record_query_result<T, E>(
    operation: &'static str,
    result: &Result<T, E>,
    elapsed: Duration,
) {
    let outcome = record_operation_result(result);
    DURATION
        .get_or_create(&QueryLabels {
            operation,
            outcome: outcome.into(),
        })
        .observe(elapsed.as_secs_f64());
}
