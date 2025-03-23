use tracing::level_filters::LevelFilter;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::fmt::time::ChronoLocal;

pub struct Logger {}

impl Logger {
    pub fn init() {
        let filter = EnvFilter::builder()
            .with_default_directive(LevelFilter::DEBUG.into())
            .from_env()
            .unwrap()
            .add_directive("rustls=off".parse().unwrap());

        tracing_subscriber::fmt()
            .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))
            .with_env_filter(filter)
            // .with_max_level(tracing::Level::DEBUG)
            .init();
    }
}
