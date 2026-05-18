use std::cmp::max;
use std::sync::Arc;

use tower_governor::GovernorLayer;

use crate::shared::http::rate_limit::RateLimitLayer;

#[bon::builder]
pub(crate) fn limit_layer(
    req_per_sec: u64,
    burst_size: u32,
    bypass_token: Option<String>,
) -> RateLimitLayer {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let mut config_builder = GovernorConfigBuilder::default();
    config_builder
        .per_nanosecond(max(1_000_000_000 / req_per_sec, 1))
        .burst_size(burst_size);
    let config = config_builder.finish().unwrap();

    let governor_conf = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_mins(1);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            governor_limiter.retain_recent();
        }
    });

    RateLimitLayer::new(bypass_token, GovernorLayer::new(governor_conf))
}
