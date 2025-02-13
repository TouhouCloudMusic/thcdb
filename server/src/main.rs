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
    clippy::wildcard_imports
)]

mod api_response;
mod controller;
mod dto;
mod error;
mod infrastructure;
mod middleware;
mod model;
mod pg_func_ext;
mod repo;
mod resolver;
mod service;
mod state;
mod types;
mod utils;

use std::net::SocketAddr;

use axum::Router;
use axum::routing::get;
use axum_login::AuthManagerLayerBuilder;
use axum_login::tower_sessions::cookie::time::Duration;
use axum_login::tower_sessions::{Expiry, SessionManagerLayer};
use dto::enums::check_database_lookup_tables;
use state::AppState;
#[cfg(not(target_env = "msvc"))]
use tikv_jemallocator::Jemalloc;
use tokio::signal;
use tower_sessions_redis_store::RedisStore;
use tracing_subscriber::fmt::time::ChronoLocal;
use utoipa_scalar::{Scalar, Servable};
use utoipa_swagger_ui::SwaggerUi;

use crate::service::user::AuthSession;

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

    check_database_lookup_tables(&state.database)
        .await
        .expect("Error while checking database lookup tables.");

    let config = state.config.clone();

    let router = router(state);

    let listener = tokio::net::TcpListener::bind(format!(
        "0.0.0.0:{}",
        config.server_port
    ))
    .await
    .unwrap();

    tracing::info!(
        "Server listening on http://127.0.0.1:{}",
        config.server_port
    );

    axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
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

fn router(state: AppState) -> Router {
    let session_store = RedisStore::new(state.redis_pool());

    let session_layer = SessionManagerLayer::new(session_store)
        .with_name("session_token")
        .with_expiry(Expiry::OnInactivity(Duration::days(30)));

    let auth_layer =
        AuthManagerLayerBuilder::new(state.user_service.clone(), session_layer)
            .build();

    let (api_router, api_doc) = controller::api_router().split_for_parts();

    let doc_router = api_router
        .merge(SwaggerUi::new("/docs").url("/openapi.json", api_doc.clone()))
        .merge(Scalar::with_url("/scalar", api_doc));

    Router::new()
        .route(
            "/",
            get(|session: AuthSession| async {
                format!("Hello, {}!", {
                    match session.user {
                        Some(user) => user.name,
                        _ => "world".to_string(),
                    }
                })
            }),
        )
        .merge(doc_router)
        .layer(auth_layer)
        .layer(
            middleware::limit_layer()
                .req_per_sec(5)
                .burst_size(8)
                .call(),
        )
        .with_state(state)
}
