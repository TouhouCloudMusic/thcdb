use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};

use crate::domain::image;
use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;
use crate::shared::types::BoxedError;

#[derive(Debug, Display, DeriveError)]
pub enum Error {
    #[display("{source}")]
    Database {
        #[error(source)]
        source: DatabaseError,
    },
    #[display("{source}")]
    Infra {
        #[error(source)]
        source: crate::infra::Error,
    },
    #[display("{source}")]
    Service {
        #[error(source)]
        source: image::Error,
    },
    #[display("{source}")]
    ReleaseNotFound {
        #[error(source)]
        source: ReleaseNotFound,
    },
}

impl From<infra::Error> for Error {
    fn from(source: infra::Error) -> Self {
        Self::Infra { source }
    }
}

impl From<BoxedError> for Error {
    fn from(value: BoxedError) -> Self {
        Self::Infra {
            source: value.into(),
        }
    }
}

impl From<DatabaseError> for Error {
    fn from(source: DatabaseError) -> Self {
        Self::Database { source }
    }
}

impl From<image::Error> for Error {
    fn from(source: image::Error) -> Self {
        Self::Service { source }
    }
}

impl From<ReleaseNotFound> for Error {
    fn from(source: ReleaseNotFound) -> Self {
        Self::ReleaseNotFound { source }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::Service { source } => match source {
                image::Error::InvalidInput(source) => {
                    AppError::bad_request(source.to_string())
                }
                image::Error::Internal(source) => {
                    AppError::internal_boxed(source)
                }
            },
            Error::ReleaseNotFound { source } => {
                AppError::bad_request(source.to_string())
            }
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Clone, Copy, Display, DeriveError)]
#[display("release #{release_id} not found")]
pub struct ReleaseNotFound {
    release_id: i32,
}

impl ReleaseNotFound {
    pub const fn new(release_id: i32) -> Self {
        Self { release_id }
    }
}
