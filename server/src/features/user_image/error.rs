use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};
use sea_orm::DbErr;

use crate::domain::image;
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
    ImageService {
        #[error(source)]
        source: image::Error,
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

impl From<crate::infra::Error> for Error {
    fn from(source: crate::infra::Error) -> Self {
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

impl From<image::Error> for Error {
    fn from(source: image::Error) -> Self {
        Self::ImageService { source }
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database { source } => source.into(),
            Error::Infra { source } => source.into(),
            Error::ImageService { source } => match source {
                image::Error::InvalidInput(source) => {
                    AppError::bad_request(source.to_string())
                }
                image::Error::Internal(source) => {
                    AppError::internal_boxed(source.0)
                }
            },
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
