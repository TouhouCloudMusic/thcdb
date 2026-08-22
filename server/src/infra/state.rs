use auth_worker::password_reset_email::{
    Queue, queue as password_reset_email_queue,
};
use infra_db::SeaOrmRepository;
use infra_email::Mailer;
use infra_storage_worker::{RemoveFileQueue, queue as remove_file_queue};
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use sea_orm::DatabaseConnection;
use snafu::{FromString, ResultExt, Whatever};

use super::config::{Config, EmailSecurity};
use super::database::{get_connection, init_database};
use super::redis::Pool;
use crate::features::user_event::UserEventSender;

#[derive(Clone)]
pub struct AppState {
    pub database: DatabaseConnection,

    redis_pool: fred::prelude::Pool,

    pub mailer: Mailer,

    pub sea_orm_repo: SeaOrmRepository,

    pub password_reset_email_queue: Queue,

    pub remove_file_queue: RemoveFileQueue,

    pub(crate) user_events: UserEventSender,
}

impl AppState {
    pub async fn init(config: &Config) -> Result<Self, Whatever> {
        let conn = get_connection(&config.database_url).await;
        init_database(&conn).await;

        let redis_pool = Pool::init(&config.redis_url).await.inner;

        let password_reset_email_queue =
            password_reset_email_queue(&config.redis_url)
                .await
                .map_err(|err| {
                    Whatever::without_source(format!(
                        "Failed to initialize password reset queue: {err}"
                    ))
                })?;

        let remove_file_queue =
            remove_file_queue(&config.redis_url).await.map_err(|err| {
                Whatever::without_source(format!(
                    "Failed to initialize remove file queue: {err}"
                ))
            })?;

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

        let user_events = UserEventSender::new(256);

        Ok(Self {
            database: conn.clone(),
            redis_pool,
            mailer: Mailer::new(transport, from),
            sea_orm_repo: SeaOrmRepository::new(conn.clone()),
            password_reset_email_queue,
            remove_file_queue,
            user_events,
        })
    }
}

impl AppState {
    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.clone()
    }
}
