use axum::response::IntoResponse;

use super::{comment, shared};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum SubmissionError {
    #[display("{_0}")]
    Validation(#[error(ignore)] String),
    #[display("Permission denied")]
    PermissionDenied,
    #[display("Correction not found")]
    NotFound,
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl IntoResponse for SubmissionError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SubmissionError::Validation(message) => {
                AppError::bad_request(message).into_response()
            }
            SubmissionError::PermissionDenied => {
                PermissionDenied.into_response()
            }
            SubmissionError::NotFound => {
                AppError::not_found("Correction not found").into_response()
            }
            SubmissionError::Database(source) => source.into_response(),
            SubmissionError::Internal(source) => source.into_response(),
        }
    }
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum ModerationError {
    #[display("Correction not found")]
    NotFound,
    #[display("Correction already handled")]
    AlreadyHandled,
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl IntoResponse for ModerationError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ModerationError::NotFound => {
                AppError::not_found("Correction not found").into_response()
            }
            ModerationError::AlreadyHandled => {
                AppError::conflict("Correction already handled").into_response()
            }
            ModerationError::Database(source) => source.into_response(),
            ModerationError::Internal(source) => source.into_response(),
        }
    }
}

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub(crate) enum ReadError {
    #[display("{_0}")]
    NotFound(#[error(ignore)] &'static str),
    #[display("{_0}")]
    InvalidRequest(#[error(ignore)] &'static str),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
    #[display("{_0}")]
    #[from]
    Comment(#[error(source)] comment::Error),
    #[display("{_0}")]
    #[from]
    Snapshot(#[error(source)] shared::repo::SnapshotError),
}

impl IntoResponse for ReadError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ReadError::NotFound(message) => {
                AppError::not_found(message).into_response()
            }
            ReadError::InvalidRequest(message) => {
                AppError::bad_request(message).into_response()
            }
            ReadError::Database(source) => source.into_response(),
            ReadError::Comment(source) => source.into_response(),
            ReadError::Snapshot(source) => match source {
                err @ shared::repo::SnapshotError::BrokenReference(_) => {
                    InternalError::new(err).into_response()
                }
                shared::repo::SnapshotError::Database(source) => {
                    source.into_response()
                }
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::SubmissionError;
    use crate::domain::song::{ValidationError, ValidationErrorKind};

    #[test]
    fn validation_returns_bad_request() {
        let err = SubmissionError::Validation(
            ValidationError::from(ValidationErrorKind::SelfRelation)
                .to_string(),
        );

        assert_eq!(err.into_response().status(), StatusCode::BAD_REQUEST);
    }
}
