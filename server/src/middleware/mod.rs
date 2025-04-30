use std::sync::Arc;

use governor::clock::QuantaInstant;
use tower_governor::GovernorLayer;
use tower_governor::key_extractor::PeerIpKeyExtractor;

#[bon::builder]
pub fn limit_layer(
    req_per_sec: u64,
    burst_size: u32,
) -> GovernorLayer<
    PeerIpKeyExtractor,
    governor::middleware::NoOpMiddleware<QuantaInstant>,
> {
    use std::time::Duration;

    use tower_governor::governor::GovernorConfigBuilder;

    let config = GovernorConfigBuilder::default()
        .per_second(req_per_sec)
        .burst_size(burst_size)
        .finish()
        .unwrap();

    let governor_conf: Arc<
        tower_governor::governor::GovernorConfig<
            PeerIpKeyExtractor,
            governor::middleware::NoOpMiddleware<QuantaInstant>,
        >,
    > = Arc::new(config);

    let governor_limiter = governor_conf.limiter().clone();

    let interval = Duration::from_secs(60);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            // tracing::info!(
            //     "rate limiting storage size: {}",
            //     governor_limiter.len()
            // );
            governor_limiter.retain_recent();
        }
    });

    GovernorLayer {
        config: governor_conf,
    }
}
