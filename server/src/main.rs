#![feature(min_specialization, return_type_notation, trait_alias, try_blocks)]

mod adapter;
mod cli;
mod constant;
mod features;
mod infra;
mod shared;
mod utils;
mod worker;

use std::fs;
use std::sync::Arc;

use infra::logger::Logger;
use infra::singleton::APP_CONFIG;
use infra::state::AppState;
use snafu::{ResultExt, Whatever};

use crate::cli::CliArgs;

#[cfg(all(feature = "release", unix))]
mod alloc {
    use mimalloc::MiMalloc;

    #[global_allocator]
    static GLOBAL: MiMalloc = MiMalloc;
}

#[tokio::main]
#[snafu::report]
async fn main() -> Result<(), Whatever> {
    let cli = CliArgs::parse()?;

    if let Some(path) = cli.openapi_out {
        let openapi = adapter::inbound::rest::generate_openapi();
        let json = serde_json::to_string_pretty(&openapi)
            .whatever_context("Failed to serialize OpenAPI schema")?;

        fs::write(&path, json)
            .whatever_context("Failed to write OpenAPI schema file")?;

        return Ok(());
    }

    // Load .env file if exists
    let _ = dotenvy::dotenv();
    Logger::init();

    log::info!(target: "app", phase = "startup"; "starting server");

    let result = async {
        let state = Arc::new(
            AppState::init(&APP_CONFIG)
                .await
                .whatever_context("Failed to initialize app state")?,
        );
        let listener = tokio::net::TcpListener::bind(format!(
            "0.0.0.0:{}",
            APP_CONFIG.app.port
        ))
        .await
        .whatever_context("Failed to bind TCP listener")?;

        log::info!(
            target: "app",
            port = APP_CONFIG.app.port;
            "server listening"
        );

        tokio::select! {
            result = worker::run(&state) => {
                result.whatever_context("Worker runtime failed")
            }
            result = adapter::inbound::rest::listen(
                listener,
                Arc::clone(&state),
            ) => {
                result.whatever_context("Failed to start REST listener")
            }
        }
    }
    .await;

    Logger::flush();

    result
}
