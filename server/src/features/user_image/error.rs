use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};
use sea_orm::DbErr;

use crate::domain::image::{
    ValidationError, {self},
};
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
        source: crate::infra::Error,
    },
    #[display("{source}")]
    ImageService {
        #[error(source)]
        source: image::Error,
    },
    #[display("{source}")]
    Validate {
        #[error(source)]
        source: ValidationError,
    },
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("user image database operation"),
        }
    }
}

impl<E> From<E> for Error
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl From<image::Error> for Error {
    fn from(source: image::Error) -> Self {
        Self::ImageService { source }
    }
}

impl From<ValidationError> for Error {
    fn from(source: ValidationError) -> Self {
        Self::Validate { source }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::ImageService { source } => source.into(),
            Error::Validate { source } => source.into(),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
