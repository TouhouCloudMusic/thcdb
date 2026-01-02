use std::ops::Deref;
use std::sync::Arc;

use axum::extract::FromRef;

use crate::application::{self, user_profile};
pub(crate) use crate::infra::database::sea_orm::{
    SeaOrmRepository, SeaOrmTxRepo,
};
use crate::infra::singleton::FS_IMAGE_BASE_PATH;
use crate::infra::state::AppState;
use crate::infra::storage::{GenericFileStorage, GenericFileStorageConfig};

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

pub(crate) type AuthService = crate::features::auth::Service;

pub(crate) type AuthSession = axum_login::AuthSession<AuthService>;

pub(crate) type ArtistImageService = crate::features::artist_image::Service;
pub(crate) type ReleaseImageService = crate::features::release_image::Service;

pub(crate) type CorrectionService =
    application::correction::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for CorrectionService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(crate) type UserImageService =
    application::user_image::Service<SeaOrmRepository, GenericFileStorage>;
pub(crate) type UserProfileService = user_profile::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for SeaOrmRepository {
    fn from_ref(input: &ArcAppState) -> Self {
        input.sea_orm_repo.clone()
    }
}

impl FromRef<ArcAppState> for UserProfileService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

impl FromRef<ArcAppState> for AuthService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

impl FromRef<ArcAppState> for ReleaseImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        let repo = input.sea_orm_repo.clone();
        let storage = GenericFileStorage::new(GenericFileStorageConfig {
            fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
            redis_pool: input.redis_pool(),
        });
        Self::new(repo, storage)
    }
}

impl FromRef<ArcAppState> for ArtistImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        let repo = input.sea_orm_repo.clone();
        let storage = GenericFileStorage::new(GenericFileStorageConfig {
            fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
            redis_pool: input.redis_pool(),
        });
        Self::new(repo, storage)
    }
}

impl FromRef<ArcAppState> for UserImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        let repo = input.sea_orm_repo.clone();
        let storage = GenericFileStorage::new(GenericFileStorageConfig {
            fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
            redis_pool: input.redis_pool(),
        });
        Self::new(repo, storage)
    }
}
