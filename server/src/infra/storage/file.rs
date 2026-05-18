use std::path::PathBuf;

use domain::image::Image;
use entity::enums::StorageBackend;
use infra_storage::FsStorage;
use infra_storage_worker::{RemoveFileDeferredDelete, RemoveFileQueue};

use crate::features::image_upload::{AsyncFileStorage, NewImage};
use crate::shared::error::InternalError;

#[derive(Clone)]
pub struct GenericFileStorage {
    fs: FsStorage,
    deferred_delete: RemoveFileDeferredDelete,
}

pub struct GenericFileStorageConfig {
    pub fs_base_path: PathBuf,
    pub remove_file_queue: RemoveFileQueue,
}

impl GenericFileStorage {
    pub fn new(
        GenericFileStorageConfig {
            fs_base_path,
            remove_file_queue,
        }: GenericFileStorageConfig,
    ) -> Self {
        Self {
            fs: FsStorage::new(fs_base_path),
            deferred_delete: RemoveFileDeferredDelete::new(remove_file_queue),
        }
    }
}

impl AsyncFileStorage for GenericFileStorage {
    type File = tokio::fs::File;

    async fn create(
        &self,
        image: NewImage,
    ) -> Result<Self::File, InternalError> {
        let full_path = image.full_path();
        let data = image.bytes;
        match image.backend {
            StorageBackend::Fs => self
                .fs
                .create(full_path, &data)
                .await
                .map_err(InternalError::new),
        }
    }

    async fn remove(&self, image: Image) -> Result<(), InternalError> {
        match image.backend {
            StorageBackend::Fs => self
                .fs
                .remove_or_defer(image.full_path(), &self.deferred_delete)
                .await
                .map_err(InternalError::new),
        }
    }
}
