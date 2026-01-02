#![deny(unused_must_use, unconditional_recursion)]
#![deny(clippy::clone_on_copy)]
#![warn(clippy::cargo, clippy::nursery, clippy::pedantic)]
#![warn(clippy::allow_attributes)]
#![allow(dead_code, async_fn_in_trait)]
#![allow(
    // We won't release
    clippy::cargo_common_metadata,
    clippy::missing_docs_in_private_items,
    // Detection is not smart
    clippy::cognitive_complexity,
    // Sometimes useful
    clippy::enum_glob_use,
    clippy::wildcard_imports,
    clippy::iter_on_single_items,
    clippy::multiple_crate_versions,
    clippy::single_call_fn,
    clippy::unreadable_literal,
    // Sometimes annoying
    clippy::use_self,
    clippy::redundant_pub_crate,
)]
#![feature(
    bool_to_result,
    error_generic_member_access,
    min_specialization,
    new_range_api,
    return_type_notation,
    trait_alias,
    try_blocks,
    variant_count
)]

mod adapter;
mod application;
mod constant;
mod domain;
mod features;
mod infra;
mod shared;
mod utils;

use std::sync::Arc;

use infra::logger::Logger;
use infra::singleton::APP_CONFIG;
use infra::state::AppState;
use snafu::{ResultExt, Whatever};

use self::infra::worker::Worker;

#[cfg(all(feature = "release", unix))]
mod alloc {
    use tikv_jemallocator::Jemalloc;
    #[global_allocator]
    static GLOBAL: Jemalloc = Jemalloc;
}

#[tokio::main]
#[snafu::report]
async fn main() -> Result<(), Whatever> {
    // Load .env file if exists
    let _ = dotenvy::dotenv();
    Logger::init();

    tracing::info!("Starting server");

    let state = AppState::init(&APP_CONFIG).await;

    Worker {
        redis_pool: state.redis_pool(),
    }
    .init();

    let listener = tokio::net::TcpListener::bind(format!(
        "0.0.0.0:{}",
        APP_CONFIG.app.port
    ))
    .await
    .whatever_context("Failed to bind TCP listener")?;

    tracing::info!(
        "Server listening on http://127.0.0.1:{}",
        APP_CONFIG.app.port
    );

    adapter::inbound::rest::listen(listener, Arc::new(state))
        .await
        .whatever_context("Failed to start REST listener")?;

    Ok(())
}
