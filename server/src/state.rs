use std::sync::LazyLock;

use argon2::Argon2;
use axum::extract::FromRef;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use macros::inject_services;
use sea_orm::{DatabaseConnection, sqlx};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;

pub static CONFIG: LazyLock<Config> = LazyLock::new(Config::init);

#[inject_services(
    artist, correction, event, image, label, release, song, tag, user
)]
#[derive(Clone, FromRef)]
pub struct AppState {
    pub database: DatabaseConnection,
    redis_pool: Pool,
    pub transport: AsyncSmtpTransport<Tokio1Executor>,
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}

// Should this be a singleton?
pub static ARGON2_HASHER: LazyLock<Argon2> = LazyLock::new(Argon2::default);
