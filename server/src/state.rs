use std::ops::Deref;
use std::path::PathBuf;
use std::sync::{Arc, LazyLock};

use argon2::Argon2;
use axum::extract::FromRef;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, Tokio1Executor};
use macros::FromRefArc;
use sea_orm::{DatabaseConnection, sqlx};

use crate::application::artist::upload_profile_image::UploadArtistProfileImageUseCase as UploadArtistProfileImageUseCaseTrait;
use crate::application::use_case;
use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::controller::TryFromRef;
use crate::domain::repository::TransactionManager;
use crate::error::InfraError;
pub use crate::infrastructure::adapter::database::sea_orm::{
    SeaOrmRepository, SeaOrmTransactionRepository,
};
use crate::infrastructure::config::Config;
use crate::infrastructure::database::get_connection;
use crate::infrastructure::redis::Pool;
use crate::infrastructure::storage::{
    GenericImageStorage, GenericImageStorageConfig,
};

pub type ArtistService = crate::service::artist::Service;
pub type UploadArtistProfileImageUseCase =
    UploadArtistProfileImageUseCaseTrait<SeaOrmRepository, GenericImageStorage>;

pub type CorretionService = crate::service::correction::Service;

pub type EventService = crate::service::event::Service;

pub type ImageService = crate::domain::image::Service<
    SeaOrmTransactionRepository,
    GenericImageStorage,
>;

pub type LabelService = crate::service::label::Service;

pub type ReleaseService = crate::service::release::Service;

pub type SongService = crate::service::song::Service;

pub type TagService = crate::service::tag::Service<SeaOrmRepository>;
pub type UserService = crate::service::user::Service;
pub type UserImageService = crate::application::service::user::UserImageService<
    SeaOrmTransactionRepository,
    ImageService,
>;

pub type AuthService =
    crate::application::service::auth::AuthService<SeaOrmRepository>;

pub type AuthSession = axum_login::AuthSession<AuthService>;

pub static APP_CONFIG: LazyLock<Config> = LazyLock::new(Config::init);
pub static ARGON2_HASHER: LazyLock<Argon2> = LazyLock::new(Argon2::default);

static FS_IMAGE_BASE_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));
static FS_IMAGE_STORAGE: LazyLock<GenericImageStorage> = LazyLock::new(|| {
    GenericImageStorage::new(GenericImageStorageConfig {
        fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
    })
});

#[derive(Clone, FromRefArc)]
pub struct AppState {
    #[from_ref_arc(skip)]
    pub database: DatabaseConnection,
    #[from_ref_arc(skip)]
    redis_pool: Pool,
    #[from_ref_arc(skip)]
    pub transport: AsyncSmtpTransport<Tokio1Executor>,

    pub sea_orm_repo: SeaOrmRepository,
}

impl AppState {
    pub async fn init() -> Self {
        let conn = get_connection(&APP_CONFIG.database_url).await;
        let redis_pool = Pool::init(&APP_CONFIG.redis_url).await;
        let stmp_conf = &APP_CONFIG.email;
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

    pub fn sqlx_pool(&self) -> &sqlx::PgPool {
        self.database.get_postgres_connection_pool()
    }
}

#[derive(Clone)]
pub struct ArcAppState(Arc<AppState>);

impl Deref for ArcAppState {
    type Target = AppState;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ArcAppState {
    pub async fn init() -> Self {
        Self(Arc::new(AppState::init().await))
    }
}

impl FromRef<ArcAppState> for SeaOrmRepository {
    fn from_ref(input: &ArcAppState) -> Self {
        input.sea_orm_repo.clone()
    }
}

impl FromRef<ArcAppState> for use_case::user::Profile<SeaOrmRepository> {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

impl FromRef<ArcAppState> for ArtistService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl TryFromRef<ArcAppState> for ImageService {
    type Rejection = InfraError;

    async fn try_from_ref(input: &ArcAppState) -> Result<Self, Self::Rejection>
    where
        Self: Sized,
    {
        let tx_repo = input.sea_orm_repo.begin().await?;

        Ok(ImageService::builder()
            .repo(tx_repo)
            .storage(FS_IMAGE_STORAGE.clone())
            .build())
    }
}

impl FromRef<ArcAppState> for TagService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone(), input.sea_orm_repo.clone())
    }
}

impl FromRef<ArcAppState> for UserService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for CorretionService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for EventService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for LabelService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for ReleaseService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for SongService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.database.clone())
    }
}

impl FromRef<ArcAppState> for AuthService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

impl FromRef<ArcAppState> for UploadArtistProfileImageUseCase {
    fn from_ref(input: &ArcAppState) -> Self {
        let repo = input.sea_orm_repo.clone();
        let storage = FS_IMAGE_STORAGE.clone();
        Self::new(repo, storage)
    }
}

impl TryFromRef<ArcAppState> for SeaOrmTransactionRepository {
    type Rejection = InfraError;

    async fn try_from_ref(input: &ArcAppState) -> Result<Self, Self::Rejection>
    where
        Self: Sized,
    {
        Ok(input.sea_orm_repo.begin().await?)
    }
}

impl TryFromRef<ArcAppState> for UserImageService {
    type Rejection = InfraError;

    async fn try_from_ref(input: &ArcAppState) -> Result<Self, Self::Rejection>
    where
        Self: Sized,
    {
        let tx_repo = SeaOrmTransactionRepository::try_from_ref(input).await?;

        let image_service = ImageService::builder()
            .repo(tx_repo.clone())
            .storage(FS_IMAGE_STORAGE.clone())
            .build();
        Ok(Self::new(tx_repo, image_service))
    }
}
