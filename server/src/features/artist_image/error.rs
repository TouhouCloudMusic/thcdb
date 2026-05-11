use axum::response::{IntoResponse, Response};
use derive_more::{Display, Error as DeriveError};

use crate::application::error::EntityNotFound;
use crate::domain::image;
use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

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
        source: EntityNotFound,
    },
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        AppError::from(self).into_response()
    }
}

impl<A> From<A> for Error
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
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

impl From<EntityNotFound> for Error {
    fn from(source: EntityNotFound) -> Self {
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
