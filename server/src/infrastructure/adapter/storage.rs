pub mod image {
    use std::path::PathBuf;
    use std::sync::LazyLock;

    use axum::http::StatusCode;
    use macros::ApiError;
    use tokio::io::AsyncWriteExt;

    use crate::constant::{IMAGE_DIR, PUBLIC_DIR};
    use crate::domain::service::image::{
        AsyncImageStorage, InvalidType, ValidatedPath,
    };
    use crate::error::ErrorCode;

    #[derive(thiserror::Error, Debug, ApiError)]
    pub enum LocalFileImageStorageError {
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::InvalidImageType,
            into_response = self
        )]
        #[error(transparent)]
        InvalidType(#[from] InvalidType),
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::IoError,
            into_response = self
        )]
        #[error("{}", ErrorCode::IoError.message())]
        Io(#[from] std::io::Error),
    }

    #[derive(Clone)]
    pub struct LocalFileImageStorage {
        pub base_path: &'static PathBuf,
    }

    pub static DEFAULT_PATH: LazyLock<PathBuf> =
        LazyLock::new(|| PathBuf::from_iter([PUBLIC_DIR, IMAGE_DIR]));

    pub static FILE_IMAGE_STORAGE: LazyLock<LocalFileImageStorage> =
        LazyLock::new(|| LocalFileImageStorage::new(&DEFAULT_PATH));

    impl LocalFileImageStorage {
        pub const fn new(base_path: &'static PathBuf) -> Self {
            Self { base_path }
        }
    }

    impl AsyncImageStorage for LocalFileImageStorage {
        type File = tokio::fs::File;
        type CreateError = LocalFileImageStorageError;
        type RemoveError = std::io::Error;

        async fn create(
            &self,
            path: &ValidatedPath,
            data: &[u8],
        ) -> Result<Self::File, Self::CreateError> {
            let path = path.inner();
            tokio::fs::create_dir_all(
                path.parent()
                    .expect("Failed to get parent dir while creating image"),
            )
            .await?;

            let mut file = tokio::fs::File::create(&path).await?;

            let write_file_res: Result<(), std::io::Error> = try {
                file.write_all(data).await?;
                file.flush().await?;
            };

            match write_file_res {
                Ok(()) => Ok(file),
                Err(err) => {
                    self.remove(&path).await?;
                    Err(err)?
                }
            }
        }

        async fn remove(
            &self,
            path: impl AsRef<std::path::Path> + Send + Sync,
        ) -> Result<(), Self::RemoveError> {
            tokio::fs::remove_file(&path).await.inspect_err(|e| {
                tracing::error!("Failed to remove file: {}", e);
            })
        }
    }
}
