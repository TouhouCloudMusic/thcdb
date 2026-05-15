#![feature(
    bool_to_result,
    min_specialization,
    return_type_notation,
    trait_alias,
    try_blocks
)]

mod adapter;
mod application;
mod cli;
mod constant;
mod domain;
mod features;
mod infra;
mod shared;
mod utils;

use std::fs;
use std::sync::Arc;

use infra::logger::Logger;
use infra::singleton::APP_CONFIG;
use infra::state::AppState;
use snafu::{ResultExt, Whatever};

use self::infra::worker::Worker;
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
        let state = AppState::init(&APP_CONFIG)
            .await
            .whatever_context("Failed to initialize app state")?;

        Worker {
            redis_pool: state.redis_pool(),
            repo: state.sea_orm_repo.clone(),
            mailer: state.mailer.clone(),
            notification_retention_days: APP_CONFIG.notification.retention_days,
            password_reset_email_queue: state
                .password_reset_email_queue
                .clone(),
            remove_file_queue: state.remove_file_queue.clone(),
        }
        .init();

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

        adapter::inbound::rest::listen(listener, Arc::new(state))
            .await
            .whatever_context("Failed to start REST listener")?;

        Ok(())
    }
    .await;

    Logger::flush();

    result
}
