use macros::inject_services;
use sea_orm::{DatabaseConnection, sqlx};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;

#[inject_services(artist, correction, image, label, release, song, tag, user)]
pub struct AppState {
    pub config: Config,
    pub database: DatabaseConnection,
    pub redis_pool: Pool,
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}
