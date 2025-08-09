use std::ops::Deref;
use std::sync::Arc;

use axum::extract::FromRef;

use super::extract::TryFromRef;
use crate::application::{self, user_profile};
use crate::domain::repository::TransactionManager;
pub(super) use crate::infra::database::sea_orm::{
    SeaOrmRepository, SeaOrmTxRepo,
};
use crate::infra::error::Error;
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

pub(super) type AuthService = application::auth::AuthService<SeaOrmRepository>;

pub(super) type AuthSession = axum_login::AuthSession<AuthService>;

pub(super) type ArtistService = application::artist::Service<SeaOrmRepository>;
pub(super) type ArtistImageService =
    application::artist_image::Service<SeaOrmRepository, GenericFileStorage>;
pub(super) type ReleaseImageService =
    application::release_image::Service<SeaOrmRepository, GenericFileStorage>;

pub(super) type CorrectionService =
    application::correction::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for CorrectionService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type EventService = application::event::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for EventService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type ImageService =
    crate::domain::image::Service<SeaOrmTxRepo, GenericFileStorage>;

pub(super) type LabelService = application::label::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for LabelService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type ReleaseService =
    application::release::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for ReleaseService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type SongService = application::song::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for SongService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type SongLyricsService =
    application::song_lyrics::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for SongLyricsService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type TagService = application::tag::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for TagService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

pub(super) type UserImageService =
    application::user_image::Service<SeaOrmRepository, GenericFileStorage>;
pub(super) type UserProfileService = user_profile::Service<SeaOrmRepository>;

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

impl FromRef<ArcAppState> for ArtistService {
    fn from_ref(input: &ArcAppState) -> Self {
        ArtistService {
            repo: input.sea_orm_repo.clone(),
        }
    }
}

impl TryFromRef<ArcAppState> for ImageService {
    type Rejection = Error;

    async fn try_from_ref(input: &ArcAppState) -> Result<Self, Self::Rejection>
    where
        Self: Sized,
    {
        let tx_repo = input.sea_orm_repo.begin().await?;

        Ok(ImageService::builder()
            .repo(tx_repo)
            .storage(GenericFileStorage::new(GenericFileStorageConfig {
                fs_base_path: FS_IMAGE_BASE_PATH.to_path_buf(),
                redis_pool: input.redis_pool(),
            }))
            .build())
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

impl TryFromRef<ArcAppState> for SeaOrmTxRepo {
    type Rejection = Error;

    async fn try_from_ref(input: &ArcAppState) -> Result<Self, Self::Rejection>
    where
        Self: Sized,
    {
        Ok(input.sea_orm_repo.begin().await?)
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

pub(super) type CreditRoleService =
    application::credit_role::Service<SeaOrmRepository>;

impl FromRef<ArcAppState> for CreditRoleService {
    fn from_ref(input: &ArcAppState) -> Self {
        Self {
            repo: input.sea_orm_repo.clone(),
        }
    }
}
