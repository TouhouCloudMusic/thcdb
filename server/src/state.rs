use axum::extract::FromRef;
use sea_orm::{sqlx, DatabaseConnection};

use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::service::artist::ArtistService;
use crate::service::correction;
use crate::service::image::ImageService;
use crate::service::release::ReleaseService;
use crate::service::song::SongService;
use crate::service::tag::TagService;
use crate::service::user::UserService;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub database: DatabaseConnection,
    pub user_service: UserService,
    pub release_service: ReleaseService,
    pub image_service: ImageService,
    pub song_service: SongService,
    pub tag_service: TagService,
    pub artist_service: ArtistService,
    pub correction_service: correction::Service,
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
            user_service: UserService::new(database.clone()),
            release_service: ReleaseService::new(database.clone()),
            artist_service: ArtistService::new(database.clone()),
            image_service: ImageService::new(database.clone()),
            song_service: SongService::new(database.clone()),
            correction_service: correction::Service::new(database.clone()),
            tag_service: TagService::new(database.clone()),
            redis_pool,
        }
    }

    pub fn redis_pool(&self) -> fred::prelude::Pool {
        self.redis_pool.pool()
    }

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}
