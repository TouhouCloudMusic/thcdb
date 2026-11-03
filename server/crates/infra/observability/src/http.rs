use std::sync::LazyLock;
use std::time::Duration;

use prometheus_client::encoding::EncodeLabelSet;
use prometheus_client::registry::Registry;

use crate::metrics::{Durations, request_and_processing_duration_histogram};

#[derive(Clone, Debug, Hash, PartialEq, Eq, EncodeLabelSet)]
struct HttpLabels {
    method: &'static str,
    route: String,
    status: u16,
}

static DURATION: LazyLock<Durations<HttpLabels>> = LazyLock::new(|| {
    Durations::new_with_constructor(request_and_processing_duration_histogram)
});

pub(super) fn register(registry: &mut Registry) {
    registry.register(
        "thcdb_http_request_duration_seconds",
        "HTTP request duration until response headers are available",
        DURATION.clone(),
    );
}

pub fn observe_http(
    method: &'static str,
    route: String,
    status: u16,
    elapsed: Duration,
) {
    DURATION
        .get_or_create(&HttpLabels {
            method,
            route,
            status,
        })
        .observe(elapsed.as_secs_f64());
}
