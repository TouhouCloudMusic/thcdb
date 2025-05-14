use std::ops::Deref;
use std::sync::Arc;

use axum::extract::FromRef;

use super::extractor::TryFromRef;
use crate::application::artist::upload_profile_image::UploadArtistProfileImageUseCase as UploadArtistProfileImageUseCaseTrait;
use crate::application::use_case;
use crate::domain::repository::TransactionManager;
use crate::error::InfraError;
pub(super) use crate::infrastructure::database::sea_orm::{
    SeaOrmRepository, SeaOrmTxRepo,
};
use crate::infrastructure::singleton::FS_IMAGE_STORAGE;
use crate::infrastructure::state::AppState;
use crate::infrastructure::storage::GenericImageStorage;
use crate::service as service_old;

pub(super) type ArtistService = service_old::artist::Service;
pub(super) type ArtistServiceNew =
    crate::application::artist::Service<SeaOrmRepository>;
pub(super) type UploadArtistProfileImageUseCase =
    UploadArtistProfileImageUseCaseTrait<SeaOrmRepository, GenericImageStorage>;

pub(super) type CorretionServiceOld = service_old::correction::Service;

pub(super) type EventService = service_old::event::Service;

pub(super) type ImageService =
    crate::domain::image::Service<SeaOrmTxRepo, GenericImageStorage>;

pub(super) type LabelService = service_old::label::Service;

pub(super) type ReleaseService = service_old::release::Service;

pub(super) type SongService = service_old::song::Service;

pub(super) type TagService = service_old::tag::Service<SeaOrmRepository>;
pub(super) type UserService = service_old::user::Service;
pub(super) type UserImageService =
    crate::application::service::user::UserImageService<
        SeaOrmTxRepo,
        ImageService,
    >;

pub(super) type AuthService =
    crate::application::service::auth::AuthService<SeaOrmRepository>;

pub(super) type AuthSession = axum_login::AuthSession<AuthService>;

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

impl FromRef<ArcAppState> for ArtistServiceNew {
    fn from_ref(input: &ArcAppState) -> Self {
        ArtistServiceNew {
            repo: input.sea_orm_repo.clone(),
        }
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

impl FromRef<ArcAppState> for CorretionServiceOld {
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

impl TryFromRef<ArcAppState> for SeaOrmTxRepo {
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
        let tx_repo = SeaOrmTxRepo::try_from_ref(input).await?;

        let image_service = ImageService::builder()
            .repo(tx_repo.clone())
            .storage(FS_IMAGE_STORAGE.clone())
            .build();
        Ok(Self::new(tx_repo, image_service))
    }
}
