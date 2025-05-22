use std::path::{Path, PathBuf};

use tokio::io::AsyncWriteExt;

pub mod image;
pub use self::image::{GenericImageStorage, GenericImageStorageConfig};

#[derive(Clone)]
struct FsStorage {
    base_path: PathBuf,
}

impl FsStorage {
    const fn new(base_path: PathBuf) -> Self {
        Self { base_path }
    }
}

impl FsStorage {
    async fn create(
        &self,
        path: impl AsRef<Path>,
        data: &[u8],
    ) -> Result<tokio::fs::File, std::io::Error> {
        let full_path = PathBuf::from_iter([&self.base_path, path.as_ref()]);
        tokio::fs::create_dir_all(
            full_path
                .parent()
                .expect("Failed to get parent dir while creating image"),
        )
        .await?;

        let mut file = tokio::fs::File::create(&full_path).await?;

        let write_file_res: Result<(), std::io::Error> = try {
            file.write_all(data).await?;
            file.flush().await?;
        };

        match write_file_res {
            Ok(()) => Ok(file),
            Err(err) => {
                self.remove(&full_path).await?;
                Err(err)?
            }
        }
    }

    async fn remove(
        &self,
        path: impl AsRef<std::path::Path> + Send + Sync,
    ) -> Result<(), std::io::Error> {
        tokio::fs::remove_file(&path).await.inspect_err(|e| {
            tracing::error!("Failed to remove file: {}", e);
        })
    }
}
