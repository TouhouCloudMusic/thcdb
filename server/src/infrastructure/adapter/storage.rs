pub mod image {
    use std::path::{Path, PathBuf};
    use std::sync::LazyLock;

    use axum::http::StatusCode;
    use macros::ApiError;
    use tokio::io::AsyncWriteExt;

    use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
    use crate::domain::image::AsyncImageStorage;
    use crate::error::{ErrorCode, InternalError};

    pub static DEFAULT_PATH: LazyLock<PathBuf> =
        LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));

    pub static FILE_IMAGE_STORAGE: LazyLock<LocalFileImageStorage> =
        LazyLock::new(|| LocalFileImageStorage::new(&DEFAULT_PATH));

    #[derive(thiserror::Error, Debug, ApiError)]
    pub enum LocalFileImageStorageError {
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::IoError,
            into_response = self
        )]
        #[error("{}", ErrorCode::IoError.message())]
        Io(#[from] std::io::Error),
    }

    impl From<LocalFileImageStorageError> for InternalError {
        fn from(val: LocalFileImageStorageError) -> Self {
            match val {
                LocalFileImageStorageError::Io(err) => Self::from(err),
            }
        }
    }

    #[derive(Clone)]
    pub struct LocalFileImageStorage {
        pub base_path: &'static PathBuf,
    }

    impl LocalFileImageStorage {
        pub const fn new(base_path: &'static PathBuf) -> Self {
            Self { base_path }
        }
    }

    impl AsyncImageStorage for LocalFileImageStorage {
        type File = tokio::fs::File;
        type Error = LocalFileImageStorageError;

        async fn create(
            &self,
            path: impl AsRef<Path>,
            data: &[u8],
        ) -> Result<Self::File, Self::Error> {
            let full_path = PathBuf::from_iter([self.base_path, path.as_ref()]);
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
        ) -> Result<(), Self::Error> {
            Ok(tokio::fs::remove_file(&path).await.inspect_err(|e| {
                tracing::error!("Failed to remove file: {}", e);
            })?)
        }
    }
}
