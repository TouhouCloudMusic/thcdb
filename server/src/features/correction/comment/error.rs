use axum::response::IntoResponse;

use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

#[derive(Debug, Clone, Copy)]
pub(crate) enum NotFound {
    Correction,
    Comment,
}

impl NotFound {
    const fn message(self) -> &'static str {
        match self {
            Self::Correction => "Correction not found",
            Self::Comment => "Comment not found",
        }
    }
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(crate) enum Error {
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
    #[display("{}", _0.message())]
    NotFound(#[error(ignore)] NotFound),
    #[display("Permission denied")]
    PermissionDenied,
    #[display("{_0}")]
    InvalidRequest(#[error(ignore)] String),
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::Database(err) => err.into(),
            Error::Internal(err) => err.into(),
            Error::NotFound(kind) => AppError::not_found(kind.message()),
            Error::PermissionDenied => PermissionDenied.into(),
            Error::InvalidRequest(message) => AppError::bad_request(message),
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
