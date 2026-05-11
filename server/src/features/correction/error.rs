use sea_orm::DbErr;

use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;
use crate::shared::types::BoxedError;

#[derive(Debug, derive_more::From)]
pub enum SubmissionError {
    Validation(String),
    PermissionDenied,
    #[from]
    Database(DatabaseError),
    #[from(infra::Error, BoxedError)]
    Infra(infra::Error),
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
            SubmissionError::PermissionDenied => {
                Self::forbidden("Permission denied")
            }
            SubmissionError::Database(source) => {
                AppError::from(source).context("correction submission")
            }
            SubmissionError::Infra(source) => {
                AppError::from(source).context("correction submission")
            }
        }
    }
}

#[derive(Debug, derive_more::From)]
pub enum ModerationError {
    NotFound,
    AlreadyHandled,
    #[from]
    Database(DatabaseError),
    #[from(infra::Error, BoxedError)]
    Infra(infra::Error),
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
            ModerationError::Database(source) => {
                AppError::from(source).context("correction moderation")
            }
            ModerationError::Infra(source) => {
                AppError::from(source).context("correction moderation")
            }
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
