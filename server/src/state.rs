use axum::extract::FromRef;
use fred::prelude::RedisPool;
use sea_orm::DatabaseConnection;

use crate::service::database::get_db_connection;
use crate::service::{self};

#[derive(Clone, FromRef)]
pub struct AppState {
    pub database: DatabaseConnection,
    pub user_service: service::User,
    pub song_service: service::Song,
    pub release_service: service::Release,
    pub image_service: service::Image,
    pub config: service::config::Service,
    pub redis_service: service::redis::Service,
}

impl AppState {
    pub async fn init() -> Self {
        let config = service::config::Service::init();
        let database = get_db_connection(&config.database_url).await;
        let redis_service = service::redis::Service::init(&config).await;

        Self {
            config,
            database: database.clone(),
            user_service: service::User::new(database.clone()),
            song_service: service::Song::new(database.clone()),
            release_service: service::Release::new(database.clone()),
            image_service: service::Image::new(database.clone()),
            redis_service,
        }
    }

    pub fn redis_pool(&self) -> RedisPool {
        self.redis_service.pool()
    }
}
