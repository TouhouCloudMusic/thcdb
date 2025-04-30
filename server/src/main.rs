#![deny(unused_must_use)]
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

mod api_response;
mod app;
mod constant;
mod controller;
mod dto;
mod error;
mod infrastructure;
mod middleware;
mod model;
mod repo;
// mod resolver;
mod application;
mod domain;
mod service;
mod state;
mod types;
mod utils;

use std::net::SocketAddr;

use app::create_app;
use infrastructure::logger::Logger;
use sea_orm_migration::migrator::MigratorTrait;
use state::{ArcAppState, CONFIG};
use tokio::signal;

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

    let state = ArcAppState::init().await;

    migration::Migrator::up(&state.database, None).await?;

    model::enum_table::check_database_lookup_tables(&state.database)
        .await
        .expect("Error while checking database lookup tables.");

    let app = create_app(state).merge(constant::router());

    let listener =
        tokio::net::TcpListener::bind(format!("0.0.0.0:{}", CONFIG.app.port))
            .await?;

    tracing::info!("Server listening on http://127.0.0.1:{}", CONFIG.app.port);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async {
        match signal::ctrl_c().await {
            Ok(()) => {}
            Err(err) => {
                eprintln!("Unable to listen for shutdown signal: {err}");
            }
        }
    })
    .await?;

    Ok(())
}
