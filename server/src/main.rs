#![allow(dead_code)]
#![warn(
    clippy::as_conversions,
    clippy::cargo,
    clippy::nursery,
    clippy::pedantic
)]
#![allow(
    clippy::cargo_common_metadata,
    clippy::iter_on_single_items,
    clippy::missing_docs_in_private_items,
    clippy::multiple_crate_versions,
    clippy::single_call_fn,
    clippy::wildcard_imports,
    clippy::enum_glob_use
)]
#![deny(unused_must_use)]
#![feature(variant_count)]
#![feature(let_chains)]

mod api_response;
mod app;
mod constant;
mod controller;
mod domain;
mod dto;
mod error;
mod infrastructure;
mod middleware;
mod model;
mod repo;
// mod resolver;
mod service;
mod state;
mod types;
mod utils;

use std::net::SocketAddr;

use app::create_app;
use state::{AppState, CONFIG};
#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;
use tokio::signal;
use tracing_subscriber::fmt::time::ChronoLocal;

#[cfg(not(target_env = "msvc"))]
#[global_allocator]
static GLOBAL: Jemalloc = Jemalloc;

#[tokio::main]
async fn main() {
    tracing::info!("Starting server");

    dotenvy::dotenv().unwrap();

    tracing_subscriber::fmt()
        .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))
        .with_max_level(tracing::Level::DEBUG)
        .with_test_writer()
        .init();

    let state = AppState::init().await;

    model::lookup_table::check_database_lookup_tables(&state.database)
        .await
        .expect("Error while checking database lookup tables.");

    let app = create_app(state);

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
