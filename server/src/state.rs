use std::sync::LazyLock;

use argon2::Argon2;
use axum::extract::FromRef;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use sea_orm::{DatabaseConnection, sqlx};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::repo::SeaOrmRepository;

pub static CONFIG: LazyLock<Config> = LazyLock::new(Config::init);

#[derive(Clone, FromRef)]
pub struct AppState {
    pub database: DatabaseConnection,
    redis_pool: Pool,
    pub transport: AsyncSmtpTransport<Tokio1Executor>,
    pub artist_service: crate::service::artist::Service,
    pub correction_service: crate::service::correction::Service,
    pub event_service: crate::service::event::Service,
    pub image_service: crate::service::image::Service,
    pub label_service: crate::service::label::Service,
    pub release_service: crate::service::release::Service,
    pub song_service: crate::service::song::Service,
    pub tag_service: crate::service::tag::Service<SeaOrmRepository>,
    pub user_service: crate::service::user::Service,
}

impl AppState {
    pub async fn init() -> Self {
        let database = get_connection(&CONFIG.database_url).await;
        let redis_pool = Pool::init(&CONFIG.redis_url).await;
        let stmp_conf = &CONFIG.email;
        let creds = Credentials::new(
            stmp_conf.creds.username.clone(),
            stmp_conf.creds.password.clone(),
        );
        let transport =
            AsyncSmtpTransport::<Tokio1Executor>::relay(&stmp_conf.host)
                .unwrap()
                .credentials(creds)
                .build();
        Self {
            database: database.clone(),
            redis_pool,
            transport,
            artist_service: crate::service::artist::Service::new(
                database.clone(),
            ),
            correction_service: crate::service::correction::Service::new(
                database.clone(),
            ),
            event_service: crate::service::event::Service::new(
                database.clone(),
            ),
            image_service: crate::service::image::Service::new(
                database.clone(),
            ),
            label_service: crate::service::label::Service::new(
                database.clone(),
            ),
            release_service: crate::service::release::Service::new(
                database.clone(),
            ),
            song_service: crate::service::song::Service::new(database.clone()),
            tag_service: {
                crate::service::tag::Service::new(
                    database.clone(),
                    SeaOrmRepository::new(database.clone()),
                )
            },
            user_service: crate::service::user::Service::new(database.clone()),
        }
    }
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
