use axum::extract::FromRef;
use sea_orm::{DatabaseConnection, sqlx};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::service::*;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub config: Config,
    pub database: DatabaseConnection,
    pub redis_pool: Pool,

    pub artist_service: artist::Service,
    pub correction_service: correction::Service,
    pub image_service: image::Service,
    pub release_service: release::Service,
    pub song_service: song::Service,
    pub tag_service: tag::Service,
    pub user_service: user::Service,
}

impl AppState {
    pub async fn init() -> Self {
        let config = Config::init();
        let database = get_connection(&config.database_url).await;
        let redis_pool = Pool::init(&config.redis_url).await;

        Self {
            config,
            database: database.clone(),
            redis_pool,
            artist_service: artist::Service::new(database.clone()),
            correction_service: correction::Service::new(database.clone()),
            image_service: image::Service::new(database.clone()),
            release_service: release::Service::new(database.clone()),
            song_service: song::Service::new(database.clone()),
            tag_service: tag::Service::new(database.clone()),
            user_service: user::Service::new(database.clone()),
        }
    }

    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}
