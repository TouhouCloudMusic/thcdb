use std::path::{Path, PathBuf};
use std::time::Duration;

use entity::enums::StorageBackend;
use fred::prelude::{FredResult, ListInterface};

use super::FsStorage;
use crate::domain::image::{AsyncFileStorage, Image, NewImage};
use crate::utils::retry_async;

pub const REMOVE_FILE_FAIELD_KEY: &str = "remove_file_failed_queue";

#[derive(Clone)]
pub struct GenericFileStorage {
    fs: FsStorage,
    redis_pool: fred::prelude::Pool,
}

pub struct GenericFileStorageConfig {
    pub fs_base_path: PathBuf,
    pub redis_pool: fred::prelude::Pool,
}

impl GenericFileStorage {
    pub fn new(
        GenericFileStorageConfig {
            fs_base_path,
            redis_pool,
        }: GenericFileStorageConfig,
    ) -> Self {
        Self {
            fs: FsStorage::new(fs_base_path),
            redis_pool,
        }
    }
}

impl AsyncFileStorage for GenericFileStorage {
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
            StorageBackend::Fs => {
                match self.fs.remove(image.full_path()).await {
                    Ok(()) => Ok(()),
                    Err(e) => {
                        let final_path =
                            self.fs.prepend_prefix(image.full_path());
                        let pool = self.redis_pool.clone();
                        tokio::spawn(async move {
                            retry_async(
                                Duration::from_millis(500),
                                5,
                                async move || {
                                    enqueue_delete_task(&pool, &final_path)
                                        .await
                                },
                            )
                            .await
                        });
                        Err(e)
                    }
                }
            }
        }
    }
}

async fn enqueue_delete_task(
    pool: &fred::prelude::Pool,
    path: &Path,
) -> FredResult<()> {
    let path_str = path.to_str().expect("Failed to serialize pathbuf");
    pool.lpush(REMOVE_FILE_FAIELD_KEY, path_str).await
}
