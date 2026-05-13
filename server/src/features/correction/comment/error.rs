use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

#[derive(Debug, Clone, Copy)]
pub(in crate::features::correction) enum NotFound {
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

#[derive(Debug, derive_more::From)]
pub(in crate::features::correction) enum Error {
    #[from]
    Database(DatabaseError),
    #[from]
    Internal(InternalError),
    NotFound(NotFound),
    PermissionDenied,
    InvalidRequest(String),
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
