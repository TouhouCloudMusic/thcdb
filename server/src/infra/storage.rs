use std::path::{Path, PathBuf};

use tokio::io::AsyncWriteExt;

pub mod file;
pub use self::file::{GenericFileStorage, GenericFileStorageConfig};

#[derive(Clone)]
struct FsStorage {
    base_path: PathBuf,
}

impl FsStorage {
    const fn new(base_path: PathBuf) -> Self {
        Self { base_path }
    }

    pub fn prepend_prefix(&self, path: impl AsRef<Path>) -> PathBuf {
        let path = path.as_ref();
        assert!(
            !path.is_absolute(),
            "Path {} is absolute, this should not happen",
            path.display()
        );
        if path.starts_with(&self.base_path) {
            path.to_path_buf()
        } else {
            PathBuf::from_iter([&self.base_path, path])
        }
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
        let path = self.prepend_prefix(path);
        let res = tokio::fs::remove_file(&path).await.inspect_err(|e| {
            tracing::error!("Failed to remove file {:?}, {e}", path);
        });

        match res {
            Ok(()) => Ok(()),
            Err(e) => match e.kind() {
                // If the file does not exist, it is already removed
                std::io::ErrorKind::NotFound => Ok(()),
                _ => Err(e),
            },
        }
    }
}

#[cfg(test)]
mod test {

    #[test]
    fn fs_storage_prepend_prefix() {
        let storage = super::FsStorage::new("base/path".into());

        assert_eq!(
            storage.prepend_prefix("test").to_str().unwrap(),
            "base/path/test"
        );
        assert_eq!(
            storage.prepend_prefix("test.png").to_str().unwrap(),
            "base/path/test.png"
        );
        assert_eq!(
            storage.prepend_prefix("foo/test.png").to_str().unwrap(),
            "base/path/foo/test.png"
        );
    }

    #[test]
    #[should_panic = "Path /test is absolute, this should not happen"]
    fn fs_storage_prepend_prefix_absolute() {
        let storage = super::FsStorage::new("base/path".into());
        storage.prepend_prefix("/test");
    }
}
