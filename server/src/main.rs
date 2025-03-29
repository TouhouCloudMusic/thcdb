#![allow(dead_code)]
#![warn(
    clippy::as_conversions,
    clippy::cargo,
    clippy::nursery,
    clippy::pedantic
)]
#![allow(
    async_fn_in_trait,
    clippy::cargo_common_metadata,
    clippy::iter_on_single_items,
    clippy::missing_docs_in_private_items,
    clippy::multiple_crate_versions,
    clippy::single_call_fn,
    clippy::wildcard_imports,
    clippy::enum_glob_use,
    clippy::unreadable_literal
)]
#![deny(unused_must_use)]
#![feature(variant_count, let_chains, try_blocks, min_specialization)]

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
use state::{AppState, CONFIG};
#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;
use tokio::signal;

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().unwrap();

    Logger::init();

    tracing::info!("Starting server");

    let state = AppState::init().await;

    model::lookup_table::check_database_lookup_tables(&state.database)
        .await
        .expect("Error while checking database lookup tables.");

    let app = create_app(state).merge(constant::router());

    let listener =
        tokio::net::TcpListener::bind(format!("0.0.0.0:{}", CONFIG.app.port))
            .await
            .unwrap();

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
    .await
    .unwrap();
}
