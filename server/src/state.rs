use std::sync::LazyLock;

use argon2::Argon2;
use axum::extract::FromRef;
use macros::inject_services;
use sea_orm::{DatabaseConnection, sqlx};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;

#[inject_services(artist, correction, image, label, release, song, tag, user)]
#[derive(Clone, FromRef)]
pub struct AppState {
    pub config: Config,
    pub database: DatabaseConnection,
    redis_pool: Pool,
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}

pub static ARGON2_HASHER: LazyLock<Argon2> = LazyLock::new(Argon2::default);
