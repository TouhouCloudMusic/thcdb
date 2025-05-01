use std::path::PathBuf;
use std::sync::LazyLock;

use entity::enums::StorageBackend;

use super::FsStorage;
use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
use crate::domain::image::AsyncImageStorage;
use crate::domain::model::image::{Image, NewImage};

static FS_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));

static FILE_IMAGE_STORAGE: LazyLock<FsStorage> =
    LazyLock::new(|| FsStorage::new(FS_PATH.to_path_buf()));

pub enum Error {
    Fs(std::io::Error),
}

#[derive(Clone)]
pub struct GenericImageStorage {
    fs: FsStorage,
}

pub struct GenericImageStorageConfig {
    pub fs_base_path: PathBuf,
}

impl GenericImageStorage {
    pub fn new(
        GenericImageStorageConfig { fs_base_path }: GenericImageStorageConfig,
    ) -> Self {
        Self {
            fs: FsStorage::new(fs_base_path),
        }
    }
}

impl AsyncImageStorage for GenericImageStorage {
    type File = tokio::fs::File;
    type Error = std::io::Error;

    async fn create(&self, image: NewImage) -> Result<Self::File, Self::Error> {
        let full_path = image.full_path();
        let data = image.bytes;
        match image.backend {
            StorageBackend::Fs => self.fs.create(full_path, &data).await,
        }
    }

    async fn remove(&self, image: Image) -> Result<(), Self::Error> {
        match image.backend {
            StorageBackend::Fs => self.fs.remove(image.full_path()).await,
        }
    }
}
