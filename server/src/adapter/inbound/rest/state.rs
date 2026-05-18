use std::ops::Deref;
use std::sync::Arc;

use axum::extract::FromRef;
pub(crate) use infra_db::SeaOrmRepository;

use crate::infra::notification::NotificationHub;
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

impl From<&ArcAppState> for GenericFileStorage {
    fn from(input: &ArcAppState) -> Self {
        Self::new(GenericFileStorageConfig {
            fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
            remove_file_queue: input.remove_file_queue.clone(),
        })
    }
}

pub(crate) type AuthService = crate::features::auth::Service;

pub(crate) type AuthSession = axum_login::AuthSession<AuthService>;

pub(crate) trait AuthSessionExt {
    fn verified_user_id(&self) -> Option<i32>;
}

impl AuthSessionExt for AuthSession {
    fn verified_user_id(&self) -> Option<i32> {
        self.user
            .as_ref()
            .filter(|user| user.email_verified)
            .map(|user| user.id)
    }
}

pub(crate) type ArtistImageService = crate::features::artist_image::Service;
pub(crate) type ReleaseImageService = crate::features::release_image::Service;

pub(crate) type UserImageService = crate::features::user_image::Service;
pub(crate) type UserProfileService = crate::features::user_profile::Service;
pub(crate) type NotificationService = crate::features::notification::Service;

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
        Self::new(
            input.sea_orm_repo.clone(),
            input.mailer.clone(),
            input.redis_pool(),
            input.password_reset_email_queue.clone(),
        )
    }
}

impl FromRef<ArcAppState> for ReleaseImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone(), input.into())
    }
}

impl FromRef<ArcAppState> for ArtistImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone(), input.into())
    }
}

impl FromRef<ArcAppState> for UserImageService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone(), input.into())
    }
}

impl FromRef<ArcAppState> for NotificationHub {
    fn from_ref(input: &ArcAppState) -> Self {
        input.notification_hub.clone()
    }
}

impl FromRef<ArcAppState> for NotificationService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone(), input.notification_hub.clone())
    }
}
