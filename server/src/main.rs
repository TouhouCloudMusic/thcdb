mod controller;
mod error;
mod model;
mod resolver;
mod service;

use axum::extract::FromRef;
use axum::{routing::get, Router};
use axum_login::tower_sessions::{MemoryStore, SessionManagerLayer};
use axum_login::AuthManagerLayerBuilder;
use sea_orm::DatabaseConnection;
use service::{
    database::get_db_connection, ReleaseService, SongService, UserService,
};
use std::env;
use tracing_subscriber::fmt::time::ChronoLocal;

#[derive(Clone, FromRef)]
pub struct AppState {
    database: DatabaseConnection,
    user_service: UserService,
    song_service: SongService,
    release_service: ReleaseService,
    image_service: service::image::Service,
}

impl AppState {
    pub async fn init() -> Self {
        let database = get_db_connection().await;

        Self {
            database: database.clone(),
            user_service: UserService::new(database.clone()),
            song_service: SongService::new(database.clone()),
            release_service: ReleaseService::new(database.clone()),
            image_service: service::image::Service::new(database.clone()),
        }
    }
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().unwrap();

    tracing_subscriber::fmt()
        .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))
        .with_max_level(tracing::Level::DEBUG)
        .with_test_writer()
        .init();

    tracing::info!("Starting server");
    let server_port = env::var("SERVER_PORT").unwrap();

    let state = AppState::init().await;

    let session_store = MemoryStore::default();
    let session_layer = SessionManagerLayer::new(session_store);

    let auth_layer =
        AuthManagerLayerBuilder::new(state.user_service.clone(), session_layer)
            .build();

    let app = Router::new()
        .route("/", get(|| async { "Hello, World!" }))
        .nest("/", controller::api_router())
        .layer(auth_layer)
        .with_state(state);

    let listener =
        tokio::net::TcpListener::bind(format!("0.0.0.0:{server_port}"))
            .await
            .unwrap();

    tracing::info!("Starting server on http://127.0.0.1:{server_port}");
    axum::serve(listener, app).await.unwrap();
}
