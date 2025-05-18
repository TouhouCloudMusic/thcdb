use tracing::level_filters::LevelFilter;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::filter::ParseError;
use tracing_subscriber::fmt::time::ChronoLocal;

pub struct Logger {}

impl Logger {
    pub fn init() {
        let filter: Result<EnvFilter, ParseError> = try {
            EnvFilter::builder()
                .with_default_directive(LevelFilter::DEBUG.into())
                .from_env()
                .unwrap()
                .add_directive("rustls=off".parse()?)
        };

        let filter = filter.expect("Failed to parse logger filter");

        tracing_subscriber::fmt()
            .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))
            .with_env_filter(filter)
            // .with_max_level(tracing::Level::DEBUG)
            .init();
    }
}
