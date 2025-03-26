use std::path::PathBuf;
use std::sync::LazyLock;

use argon2::Argon2;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use macros::FromRefArc;
use sea_orm::{DatabaseConnection, sqlx};

use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::repo::SeaOrmRepository;
use crate::{application, infrastructure};

pub static CONFIG: LazyLock<Config> = LazyLock::new(Config::init);

pub type ImageSerivce = application::service::image::Service<
    infrastructure::repository::SeaOrmRepository,
    infrastructure::service::image::FileImageStorage,
>;

pub type TagService = crate::service::tag::Service<SeaOrmRepository>;

pub type UserService = crate::service::user::Service;

#[derive(Clone, FromRefArc)]
pub struct AppState {
    #[from_ref_arc(skip)]
    pub database: DatabaseConnection,
    #[from_ref_arc(skip)]
    redis_pool: Pool,
    #[from_ref_arc(skip)]
    pub transport: AsyncSmtpTransport<Tokio1Executor>,

    pub artist_service: crate::service::artist::Service,
    pub correction_service: crate::service::correction::Service,
    pub event_service: crate::service::event::Service,
    pub image_service: application::service::image::Service<
        infrastructure::repository::SeaOrmRepository,
        infrastructure::service::image::FileImageStorage,
    >,
    pub label_service: crate::service::label::Service,
    pub release_service: crate::service::release::Service,
    pub song_service: crate::service::song::Service,
    pub tag_service: TagService,
    pub user_service: UserService,
}

static IMAGE_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));

impl AppState {
    pub async fn init() -> Self {
        let conn = get_connection(&CONFIG.database_url).await;
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

        let sea_orm_repo =
            infrastructure::repository::SeaOrmRepository::new(conn.clone());

        let file_image_storage =
            infrastructure::service::image::FileImageStorage::new(&IMAGE_PATH);

        Self {
            database: conn.clone(),
            redis_pool,
            transport,
            artist_service: crate::service::artist::Service::new(conn.clone()),
            correction_service: crate::service::correction::Service::new(
                conn.clone(),
            ),
            event_service: crate::service::event::Service::new(conn.clone()),
            image_service: application::service::image::Service::builder()
                .repo(sea_orm_repo)
                .storage(file_image_storage)
                .build(),
            label_service: crate::service::label::Service::new(conn.clone()),
            release_service: crate::service::release::Service::new(
                conn.clone(),
            ),
            song_service: crate::service::song::Service::new(conn.clone()),
            tag_service: {
                crate::service::tag::Service::new(
                    conn.clone(),
                    SeaOrmRepository::new(conn.clone()),
                )
            },
            user_service: crate::service::user::Service::new(conn.clone()),
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
