use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use sea_orm::DatabaseConnection;

use super::config::Config;
use super::database::get_connection;
use super::database::sea_orm::SeaOrmRepository;
use super::redis::Pool;

#[derive(Clone)]
pub struct AppState {
    pub database: DatabaseConnection,

    redis_pool: Pool,

    pub transport: AsyncSmtpTransport<Tokio1Executor>,

    pub sea_orm_repo: SeaOrmRepository,
}

impl AppState {
    pub async fn init(config: &Config) -> Self {
        let conn = get_connection(&config.database_url).await;
        let redis_pool = Pool::init(&config.redis_url).await;
        let stmp_conf = &config.email;
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
            database: conn.clone(),
            redis_pool,
            transport,
            sea_orm_repo: SeaOrmRepository::new(conn.clone()),
        }
    }
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }
}
