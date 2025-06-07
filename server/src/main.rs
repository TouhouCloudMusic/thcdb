#![deny(unused_must_use)]
#![deny(clippy::clone_on_copy)]
#![warn(clippy::cargo, clippy::nursery, clippy::pedantic)]
#![warn(clippy::allow_attributes)]
#![allow(
    // dead_code,
     async_fn_in_trait)]
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
)]
#![feature(
    let_chains,
    min_specialization,
    new_range_api,
    return_type_notation,
    trait_alias,
    try_blocks,
    variant_count
)]

mod application;
mod constant;
mod domain;
mod infra;
mod presentation;
mod utils;

use std::sync::Arc;

use infra::logger::Logger;
use infra::singleton::APP_CONFIG;
use infra::state::AppState;
use sea_orm_migration::MigratorTrait;

use self::infra::worker::Worker;

#[cfg(all(feature = "release", unix))]
mod alloc {
    use tikv_jemallocator::Jemalloc;
    #[global_allocator]
    static GLOBAL: Jemalloc = Jemalloc;
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    Logger::init();

    tracing::info!("Starting server");

    let state = AppState::init(&APP_CONFIG).await;

    migration::Migrator::up(&state.database, None).await?;

    Worker {
        redis_pool: state.redis_pool(),
    }
    .init();

    let listener = tokio::net::TcpListener::bind(format!(
        "0.0.0.0:{}",
        APP_CONFIG.app.port
    ))
    .await?;

    tracing::info!(
        "Server listening on http://127.0.0.1:{}",
        APP_CONFIG.app.port
    );

    presentation::rest::listen(listener, Arc::new(state)).await?;

    Ok(())
}
