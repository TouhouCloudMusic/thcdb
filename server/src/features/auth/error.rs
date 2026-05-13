use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};
use sea_orm::DbErr;

use crate::domain::auth::ValidateCredsError;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::{AppError, AppErrorKind};

#[derive(Debug, Display, derive_more::Error)]
#[display("Invalid email: {email}.\n{source}")]
pub struct InvalidEmail {
    email: String,
    source: Box<dyn std::error::Error>,
}

impl InvalidEmail {
    pub fn new(
        email: impl Into<String>,
        source: impl std::error::Error + 'static,
    ) -> Self {
        Self {
            email: email.into(),
            source: Box::new(source),
        }
    }
}

#[derive(Debug, Display, DeriveError)]
pub enum SignUpError {
    #[display("Username {username} already in use")]
    UsernameAlreadyInUse { username: String },
    #[display("{source}")]
    InvalidEmail {
        #[error(source)]
        source: InvalidEmail,
    },
    #[display("Email service unavailable")]
    EmailServiceUnavailable,
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
    #[display("{source}")]
    Validate {
        #[error(source)]
        source: ValidateCredsError,
    },
}

impl From<DbErr> for SignUpError {
    fn from(err: DbErr) -> Self {
        DatabaseError::new(err)
            .with_operation("auth sign-up database operation")
            .into()
    }
}

impl From<InvalidEmail> for SignUpError {
    fn from(source: InvalidEmail) -> Self {
        Self::InvalidEmail { source }
    }
}

impl From<DatabaseError> for SignUpError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<ValidateCredsError> for SignUpError {
    fn from(source: ValidateCredsError) -> Self {
        Self::Validate { source }
    }
}

impl From<InternalError> for SignUpError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
    }
}

impl IntoResponse for SignUpError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<SignUpError> for AppError {
    #[track_caller]
    fn from(err: SignUpError) -> Self {
        match err {
            SignUpError::UsernameAlreadyInUse { .. } => {
                Self::conflict(err.to_string())
            }
            SignUpError::InvalidEmail { .. } => {
                Self::bad_request(err.to_string())
            }
            SignUpError::EmailServiceUnavailable => {
                Self::new(AppErrorKind::ServiceUnavailable, err.to_string())
            }
            SignUpError::Internal { source } => source.into(),
            SignUpError::Validate { source } => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

#[derive(Debug, Display, DeriveError)]
pub enum ResendVerificationEmailError {
    #[display("{source}")]
    InvalidEmail {
        #[error(source)]
        source: InvalidEmail,
    },
    #[display("Email service unavailable")]
    ResendEmailServiceUnavailable,
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
}

impl From<DbErr> for ResendVerificationEmailError {
    fn from(err: DbErr) -> Self {
        DatabaseError::new(err)
            .with_operation("auth resend verification email database operation")
            .into()
    }
}

impl From<InvalidEmail> for ResendVerificationEmailError {
    fn from(source: InvalidEmail) -> Self {
        Self::InvalidEmail { source }
    }
}

impl From<DatabaseError> for ResendVerificationEmailError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<InternalError> for ResendVerificationEmailError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
    }
}

impl IntoResponse for ResendVerificationEmailError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<ResendVerificationEmailError> for AppError {
    #[track_caller]
    fn from(err: ResendVerificationEmailError) -> Self {
        match err {
            ResendVerificationEmailError::InvalidEmail { .. } => {
                Self::bad_request(err.to_string())
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                Self::new(AppErrorKind::ServiceUnavailable, err.to_string())
            }
            ResendVerificationEmailError::Internal { source } => source.into(),
        }
    }
}

#[derive(Debug, Display, DeriveError)]
pub enum VerifyEmailError {
    #[display("{source}")]
    InvalidEmail {
        #[error(source)]
        source: InvalidEmail,
    },
    #[display("Invalid or expired verification code")]
    InvalidOrExpiredCode,
    #[display("Too many attempts, please resend verification code")]
    TooManyAttempts,
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
}

impl From<DbErr> for VerifyEmailError {
    fn from(err: DbErr) -> Self {
        DatabaseError::new(err)
            .with_operation("auth verify email database operation")
            .into()
    }
}

impl From<InvalidEmail> for VerifyEmailError {
    fn from(source: InvalidEmail) -> Self {
        Self::InvalidEmail { source }
    }
}

impl From<DatabaseError> for VerifyEmailError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<InternalError> for VerifyEmailError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
    }
}

impl IntoResponse for VerifyEmailError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<VerifyEmailError> for AppError {
    #[track_caller]
    fn from(err: VerifyEmailError) -> Self {
        match err {
            VerifyEmailError::InvalidEmail { .. }
            | VerifyEmailError::InvalidOrExpiredCode => {
                Self::bad_request(err.to_string())
            }
            VerifyEmailError::TooManyAttempts => {
                Self::new(AppErrorKind::TooManyRequests, err.to_string())
            }
            VerifyEmailError::Internal { source } => source.into(),
        }
    }
}
