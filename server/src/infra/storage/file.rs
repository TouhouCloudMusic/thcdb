use std::path::{Path, PathBuf};
use std::time::Duration;

use apalis::prelude::Storage;
use entity::enums::StorageBackend;

use super::FsStorage;
use crate::domain::image::{AsyncFileStorage, Image, NewImage};
use crate::infra::worker::{RemoveFileJob, RemoveFileQueue};
use crate::utils::retry_async;

pub const REMOVE_FILE_STREAM_KEY: &str = "storage:remove-file";

#[derive(Clone)]
pub struct GenericFileStorage {
    fs: FsStorage,
    remove_file_queue: RemoveFileQueue,
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
            remove_file_queue,
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
                        let queue = self.remove_file_queue.clone();
                        tokio::spawn(async move {
                            retry_async(
                                Duration::from_millis(500),
                                5,
                                async move || {
                                    enqueue_delete_task(&queue, &final_path)
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
    queue: &RemoveFileQueue,
    path: &Path,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let path_str = path.to_str().expect("Failed to serialize pathbuf");
    let mut queue = queue.clone();
    queue
        .push(RemoveFileJob {
            path: path_str.to_string(),
        })
        .await
        .map(|_task_id| ())
        .map_err(|err| {
            Box::new(err) as Box<dyn std::error::Error + Send + Sync>
        })
}
