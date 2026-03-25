use std::cmp::max;
use std::sync::Arc;

use axum::body::Body;
use governor::clock::QuantaInstant;
use governor::middleware::NoOpMiddleware;
use tower_governor::GovernorLayer;
use tower_governor::key_extractor::PeerIpKeyExtractor;

#[bon::builder]
pub(crate) fn limit_layer(
    req_per_sec: u64,
    burst_size: u32,
) -> GovernorLayer<PeerIpKeyExtractor, NoOpMiddleware<QuantaInstant>, Body> {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let config = GovernorConfigBuilder::default()
        .per_nanosecond(max(1_000_000_000 / req_per_sec, 1))
        .burst_size(burst_size)
        .finish()
        .unwrap();

    let governor_conf: Arc<
        tower_governor::governor::GovernorConfig<
            PeerIpKeyExtractor,
            NoOpMiddleware<QuantaInstant>,
        >,
    > = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_mins(1);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            governor_limiter.retain_recent();
        }
    });

    GovernorLayer::new(governor_conf)
}
