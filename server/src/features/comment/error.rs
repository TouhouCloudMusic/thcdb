use axum::response::IntoResponse;

use super::model::CommentTarget;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

#[derive(Debug, Clone, Copy)]
pub(crate) enum NotFound {
    Target(CommentTarget),
    Comment,
}

impl NotFound {
    const fn message(self) -> &'static str {
        match self {
            Self::Target(target) => target.not_found_message(),
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

impl Error {
    pub(crate) const fn target_not_found(target: CommentTarget) -> Self {
        Self::NotFound(NotFound::Target(target))
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Database(err) => err.into_response(),
            Error::Internal(err) => err.into_response(),
            Error::NotFound(kind) => {
                AppError::not_found(kind.message()).into_response()
            }
            Error::PermissionDenied => PermissionDenied.into_response(),
            Error::InvalidRequest(message) => {
                AppError::bad_request(message).into_response()
            }
        }
    }
}
