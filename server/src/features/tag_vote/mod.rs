mod http;
mod model;
mod repo;

use axum::response::{IntoResponse, Response};
pub use http::router;
use sea_orm::DbErr;

use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, derive_more::Display)]
pub enum Error {
    #[display("{_0} with id {_1} not found")]
    EntityNotFound(&'static str, i32),
    #[display("Tag with id {_0} not found")]
    TagNotFound(i32),
    #[display("{_0}")]
    Database(DatabaseError),
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Database(source) => Some(source),
            Self::EntityNotFound(_, _) | Self::TagNotFound(_) => None,
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        AppError::from(self).into_response()
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("tag vote database operation"),
        )
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::EntityNotFound(_, _) | Error::TagNotFound(_) => {
                AppError::not_found(err.to_string())
            }
            Error::Database(source) => source.into(),
        }
    }
}
