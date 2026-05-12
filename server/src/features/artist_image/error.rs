use axum::response::{IntoResponse, Response};
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
        source: infra::Error,
    },
    #[display("{source}")]
    Service {
        #[error(source)]
        source: image::Error,
    },
    #[display("{source}")]
    ArtistNotFound {
        #[error(source)]
        source: ArtistNotFound,
    },
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        AppError::from(self).into_response()
    }
}

impl From<infra::Error> for Error {
    fn from(source: infra::Error) -> Self {
        Self::Infra { source }
    }
}

impl From<BoxedError> for Error {
    fn from(source: BoxedError) -> Self {
        Self::Infra {
            source: source.into(),
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

impl From<ArtistNotFound> for Error {
    fn from(source: ArtistNotFound) -> Self {
        Self::ArtistNotFound { source }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::Service { source } => source.into(),
            Error::ArtistNotFound { source } => {
                AppError::bad_request(source.to_string())
            }
        }
    }
}

#[derive(Debug, Clone, Copy, Display, DeriveError)]
#[display("artist #{artist_id} not found")]
pub struct ArtistNotFound {
    artist_id: i32,
}

impl ArtistNotFound {
    pub const fn new(artist_id: i32) -> Self {
        Self { artist_id }
    }
}
