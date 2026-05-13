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

impl From<SubmissionError> for AppError {
    fn from(err: SubmissionError) -> Self {
        match err {
            SubmissionError::Validation(message) => Self::bad_request(message),
            SubmissionError::PermissionDenied => PermissionDenied.into(),
            SubmissionError::NotFound => {
                AppError::not_found("Correction not found")
            }
            SubmissionError::Database(source) => source.into(),
            SubmissionError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for SubmissionError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
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

impl From<ModerationError> for AppError {
    fn from(err: ModerationError) -> Self {
        match err {
            ModerationError::NotFound => {
                AppError::not_found("Correction not found")
            }
            ModerationError::AlreadyHandled => {
                AppError::conflict("Correction already handled")
            }
            ModerationError::Database(source) => source.into(),
            ModerationError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for ModerationError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
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

impl From<ReadError> for AppError {
    fn from(err: ReadError) -> Self {
        match err {
            ReadError::NotFound(message) => AppError::not_found(message),
            ReadError::InvalidRequest(message) => {
                AppError::bad_request(message)
            }
            ReadError::Database(source) => source.into(),
            ReadError::Comment(source) => source.into(),
            ReadError::Snapshot(source) => match source {
                err @ shared::repo::SnapshotError::HistoryNotFound {
                    ..
                } => AppError::not_found(err.to_string()),
                shared::repo::SnapshotError::Database(source) => source.into(),
            },
        }
    }
}

impl IntoResponse for ReadError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;

    use super::SubmissionError;
    use crate::domain::song::{ValidationError, ValidationErrorKind};
    use crate::shared::http::api_response::AppError;

    #[test]
    fn validation_returns_bad_request() {
        let err = SubmissionError::Validation(
            ValidationError::from(ValidationErrorKind::SelfRelation)
                .to_string(),
        );

        assert_eq!(AppError::from(err).status_code(), StatusCode::BAD_REQUEST);
    }
}
