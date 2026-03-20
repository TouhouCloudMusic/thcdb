use std::sync::OnceLock;

use logforth::append::file::FileBuilder;
use logforth::append::{FastraceEvent, Stdout};
use logforth::diagnostic::FastraceDiagnostic;
use logforth::filter::env_filter::EnvFilterBuilder;
use logforth::layout::TextLayout;
use logforth::record::LevelFilter;
use tracing_subscriber::layer::SubscriberExt as _;

mod otel;

pub struct Logger;

impl Logger {
    pub fn init() {
        static INIT: OnceLock<()> = OnceLock::new();

        INIT.get_or_init(|| {
            otel::init_trace_reporter();
            let subscriber = tracing_subscriber::registry()
                .with(fastrace_tracing::FastraceCompatLayer::new());

            tracing::subscriber::set_global_default(subscriber)
                .expect("Failed to set tracing subscriber");

            let stdout_layout = TextLayout::default();
            let file_layout = TextLayout::default().no_color();
            let log_file = FileBuilder::new(".", "log")
                .filename_suffix("")
                .layout(file_layout)
                .build()
                .expect("Failed to create log file");

            logforth::starter_log::builder()
                .dispatch(|dispatch| {
                    dispatch
                        .filter(LevelFilter::All)
                        .append(FastraceEvent::default())
                })
                .dispatch(|dispatch| {
                    let dispatch = dispatch
                        .filter(
                            EnvFilterBuilder::from_default_env_or("debug")
                                .filter_module("rustls", LevelFilter::Off)
                                .build(),
                        )
                        .diagnostic(FastraceDiagnostic::default())
                        .append(Stdout::default().with_layout(stdout_layout))
                        .append(log_file);

                    match otel::log_appender() {
                        Some(otel_log) => dispatch.append(otel_log),
                        None => dispatch,
                    }
                })
                .apply();
        });
    }

    pub fn flush() {
        log::logger().flush();
        fastrace::flush();
    }
}
