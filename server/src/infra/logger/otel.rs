use std::borrow::Cow;

use fastrace::collector::Config as FastraceConfig;
use fastrace_opentelemetry::OpenTelemetryReporter;
use logforth::append::OpentelemetryLog;
use logforth::append::opentelemetry::OpentelemetryLogBuilder;
use opentelemetry::{InstrumentationScope, KeyValue};
use opentelemetry_otlp::{LogExporter, SpanExporter, WithExportConfig};
use opentelemetry_sdk::Resource;

pub(super) fn init_trace_reporter() {
    if let Some(reporter) = trace_reporter() {
        fastrace::set_reporter(reporter, FastraceConfig::default());
    }
}

pub(super) fn log_appender() -> Option<OpentelemetryLog> {
    let exporter = match endpoint("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT")? {
        OtlpEndpoint::SignalSpecific(endpoint) => LogExporter::builder()
            .with_http()
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to build OpenTelemetry log exporter"),
        OtlpEndpoint::Shared => LogExporter::builder()
            .with_http()
            .build()
            .expect("Failed to build OpenTelemetry log exporter"),
    };
    let service_name = service_name();

    Some(
        OpentelemetryLogBuilder::new(service_name.clone(), exporter)
            .label("service.name", service_name)
            .label("service.version", env!("CARGO_PKG_VERSION"))
            .build(),
    )
}

fn trace_reporter() -> Option<OpenTelemetryReporter> {
    let exporter = match endpoint("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")? {
        OtlpEndpoint::SignalSpecific(endpoint) => SpanExporter::builder()
            .with_http()
            .with_endpoint(endpoint)
            .build()
            .expect("Failed to build OpenTelemetry trace exporter"),
        OtlpEndpoint::Shared => SpanExporter::builder()
            .with_http()
            .build()
            .expect("Failed to build OpenTelemetry trace exporter"),
    };

    Some(OpenTelemetryReporter::new(
        exporter,
        Cow::Owned(resource()),
        InstrumentationScope::builder(env!("CARGO_PKG_NAME"))
            .with_version(env!("CARGO_PKG_VERSION"))
            .build(),
    ))
}

fn resource() -> Resource {
    Resource::builder()
        .with_attributes([
            KeyValue::new("service.name", service_name()),
            KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
        ])
        .build()
}

fn endpoint(signal_var: &str) -> Option<OtlpEndpoint> {
    if let Some(endpoint) = std::env::var(signal_var)
        .ok()
        .filter(|value| !value.is_empty())
    {
        return Some(OtlpEndpoint::SignalSpecific(endpoint));
    }

    std::env::var("OTEL_EXPORTER_OTLP_ENDPOINT")
        .ok()
        .filter(|value| !value.is_empty())
        .map(|_| OtlpEndpoint::Shared)
}

fn service_name() -> String {
    std::env::var("OTEL_SERVICE_NAME")
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| env!("CARGO_PKG_NAME").to_owned())
}

enum OtlpEndpoint {
    SignalSpecific(String),
    Shared,
}
