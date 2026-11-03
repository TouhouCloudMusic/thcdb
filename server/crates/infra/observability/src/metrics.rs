use std::sync::LazyLock;

use prometheus_client::encoding::text::encode;
use prometheus_client::metrics::family::Family;
use prometheus_client::metrics::histogram::Histogram;
use prometheus_client::registry::Registry;

use crate::{database, http, worker};

pub(super) type Durations<L> = Family<L, Histogram, fn() -> Histogram>;

pub(super) fn request_and_processing_duration_histogram() -> Histogram {
    // OpenTelemetry: http.server.request.duration and messaging.process.duration.
    Histogram::new([
        0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0,
        7.5, 10.0,
    ])
}

static REGISTRY: LazyLock<Registry> = LazyLock::new(|| {
    let mut registry = Registry::default();
    http::register(&mut registry);
    database::register(&mut registry);
    worker::register(&mut registry);
    registry
});

pub fn encode_metrics() -> String {
    let mut body = String::new();
    encode(&mut body, &REGISTRY)
        .expect("Encoding metrics into a String cannot fail");
    body
}
