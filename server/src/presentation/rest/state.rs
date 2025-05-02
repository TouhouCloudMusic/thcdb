use std::ops::Deref;
use std::sync::Arc;

use axum::extract::FromRef;

use super::extractor::TryFromRef;
use crate::application::artist::upload_profile_image::UploadArtistProfileImageUseCase as UploadArtistProfileImageUseCaseTrait;
use crate::application::use_case;
use crate::domain::repository::TransactionManager;
use crate::error::InfraError;
pub use crate::infrastructure::adapter::database::sea_orm::{
    SeaOrmRepository, SeaOrmTransactionRepository,
};
use crate::infrastructure::singleton::FS_IMAGE_STORAGE;
use crate::infrastructure::state::AppState;
use crate::infrastructure::storage::GenericImageStorage;

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

#[derive(Clone)]
pub struct ArcAppState(Arc<AppState>);

impl Deref for ArcAppState {
    type Target = AppState;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl ArcAppState {
    pub const fn new(state: Arc<AppState>) -> Self {
        Self(state)
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
