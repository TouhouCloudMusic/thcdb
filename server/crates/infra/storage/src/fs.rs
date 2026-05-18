use std::path::{Path, PathBuf};

use tokio::io::AsyncWriteExt;

pub trait DeferredDelete: Clone + Send + Sync + 'static {
    async fn defer_delete(&self, path: &Path) -> Result<(), std::io::Error>;
}

#[derive(Clone)]
pub struct FsStorage {
    base_path: PathBuf,
}

impl FsStorage {
    pub const fn new(base_path: PathBuf) -> Self {
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

    pub async fn create(
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
                remove_file(&full_path).await?;
                Err(err)?
            }
        }
    }

    pub async fn remove(
        &self,
        path: impl AsRef<std::path::Path> + Send + Sync,
    ) -> Result<(), std::io::Error> {
        let path = self.prepend_prefix(path);
        remove_file(&path).await
    }

    pub async fn remove_or_defer<D>(
        &self,
        path: impl AsRef<Path> + Send + Sync,
        deferred_delete: &D,
    ) -> Result<(), std::io::Error>
    where
        D: DeferredDelete,
    {
        let path = self.prepend_prefix(path);
        match remove_file(&path).await {
            Ok(()) => Ok(()),
            Err(err) => {
                if let Err(defer_err) =
                    deferred_delete.defer_delete(&path).await
                {
                    log::error!(
                        target: "infra.storage",
                        path:% = path.display(),
                        error:% = defer_err;
                        "failed to defer file deletion"
                    );
                }
                Err(err)
            }
        }
    }
}

async fn remove_file(path: &Path) -> Result<(), std::io::Error> {
    let res = tokio::fs::remove_file(path).await.inspect_err(|e| {
        log::error!(
            target: "infra.storage",
            path:% = path.display(),
            error:% = e;
            "failed to remove file"
        );
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

#[cfg(test)]
mod test {
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};

    use super::DeferredDelete;

    #[derive(Clone, Default)]
    struct RecordingDeferredDelete {
        path: Arc<Mutex<Option<PathBuf>>>,
    }

    impl DeferredDelete for RecordingDeferredDelete {
        async fn defer_delete(
            &self,
            path: &Path,
        ) -> Result<(), std::io::Error> {
            *self.path.lock().unwrap() = Some(path.to_path_buf());
            Ok(())
        }
    }

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

    #[tokio::test]
    async fn fs_storage_remove_or_defer_uses_full_path() {
        let base_path = std::env::temp_dir()
            .join(format!("thcdb-storage-test-{}", std::process::id()));
        let path = base_path.join("dir");
        std::fs::create_dir_all(&path).unwrap();

        let storage = super::FsStorage::new(base_path.clone());
        let deferred_delete = RecordingDeferredDelete::default();

        let err = storage
            .remove_or_defer("dir", &deferred_delete)
            .await
            .unwrap_err();

        assert_ne!(err.kind(), std::io::ErrorKind::NotFound);
        assert_eq!(deferred_delete.path.lock().unwrap().as_ref(), Some(&path));

        std::fs::remove_dir_all(base_path).unwrap();
    }
}
