use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use sea_orm::DatabaseConnection;
use snafu::{FromString, ResultExt, Whatever};

use super::config::{Config, EmailSecurity};
use super::database::get_connection;
use super::database::sea_orm::SeaOrmRepository;
use super::email::Mailer;
use super::notification::NotificationHub;
use super::redis::Pool;

#[derive(Clone)]
pub struct AppState {
    pub database: DatabaseConnection,

    redis_pool: fred::prelude::Pool,

    pub mailer: Mailer,

    pub sea_orm_repo: SeaOrmRepository,

    pub notification_hub: NotificationHub,
}

impl AppState {
    pub async fn init(config: &Config) -> Result<Self, Whatever> {
        let conn = get_connection(&config.database_url).await;
        let redis_pool = Pool::init(&config.redis_url).await.inner;
        let smtp_conf = &config.email;

        if smtp_conf.port == 0 {
            return Err(Whatever::without_source(
                "EMAIL__PORT must be between 1 and 65535".to_string(),
            ));
        }

        let from: Mailbox =
            smtp_conf.from.parse().with_whatever_context(|err| {
                format!("Invalid EMAIL__FROM value {}: {err}", smtp_conf.from)
            })?;

        let creds = Credentials::new(
            smtp_conf.creds.username.clone(),
            smtp_conf.creds.password.clone(),
        );
        let builder = match smtp_conf.security {
            EmailSecurity::Smtps => {
                AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_conf.host)
                    .with_whatever_context(|err| {
                        format!(
                            "Invalid EMAIL host {} for SMTPS: {err}",
                            smtp_conf.host
                        )
                    })?
            }
            EmailSecurity::Starttls => {
                AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(
                    &smtp_conf.host,
                )
                .with_whatever_context(|err| {
                    format!(
                        "Invalid EMAIL host {} for STARTTLS: {err}",
                        smtp_conf.host
                    )
                })?
            }
        };
        let transport = builder.port(smtp_conf.port).credentials(creds).build();

        Ok(Self {
            database: conn.clone(),
            redis_pool,
            mailer: Mailer::new(transport, from),
            sea_orm_repo: SeaOrmRepository::new(conn.clone()),
            notification_hub: NotificationHub::new(),
        })
    }
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.clone()
    }
}
