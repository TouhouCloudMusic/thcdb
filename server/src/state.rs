use axum::extract::FromRef;
use sea_orm::DatabaseConnection;

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::service::{self};

#[derive(Clone, FromRef)]
pub struct AppState {
    pub database: DatabaseConnection,
    pub user_service: service::User,
    pub release_service: service::Release,
    pub image_service: service::Image,
    pub config: Config,
    pub redis_pool: Pool,
}

impl AppState {
    pub async fn init() -> Self {
        let config = Config::init();
        let database = get_connection(&config.database_url).await;
        let redis_pool = Pool::init(&config.redis_url).await;

        Self {
            config,
            database: database.clone(),
            user_service: service::User::new(database.clone()),
            release_service: service::Release::new(database.clone()),
            image_service: service::Image::new(database.clone()),
            redis_pool,
        }
    }

    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }
}
