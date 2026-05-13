mod http;
mod model;
mod repo;

use axum::response::{IntoResponse, Response};
pub use http::router;

use crate::infra::database::error::DatabaseError;
use crate::shared::error::EntityNotFound;
use crate::shared::http::api_response::AppError;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    NotFound(#[error(source)] EntityNotFound),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        AppError::from(self).into_response()
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::NotFound(source) => source.into(),
            Error::Database(source) => source.into(),
        }
    }
}
