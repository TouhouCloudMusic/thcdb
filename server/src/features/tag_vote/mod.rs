mod http;
mod model;
mod repo;

use axum::response::{IntoResponse, Response};
pub use http::router;

use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0} with id {_1} not found")]
    EntityNotFound(#[error(ignore)] &'static str, #[error(ignore)] i32),
    #[display("Tag with id {_0} not found")]
    TagNotFound(#[error(ignore)] i32),
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
            Error::EntityNotFound(_, _) | Error::TagNotFound(_) => {
                AppError::not_found(err.to_string())
            }
            Error::Database(source) => source.into(),
        }
    }
}
