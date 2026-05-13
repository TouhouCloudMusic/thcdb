use sea_orm::DbErr;

use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

#[derive(Debug, derive_more::From)]
pub enum SubmissionError {
    Validation(String),
    PermissionDenied,
    NotFound,
    #[from]
    Database(DatabaseError),
    #[from]
    Internal(InternalError),
}

impl From<DbErr> for SubmissionError {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("correction submission database operation"),
        )
    }
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

#[derive(Debug, derive_more::From)]
pub enum ModerationError {
    NotFound,
    AlreadyHandled,
    #[from]
    Database(DatabaseError),
    #[from]
    Internal(InternalError),
}

impl From<DbErr> for ModerationError {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("correction moderation database operation"),
        )
    }
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
