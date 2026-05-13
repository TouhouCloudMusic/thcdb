use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError, From};

use crate::domain::auth::ValidateCredsError;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;
use crate::shared::types::BoxedError;

#[derive(Debug, Display, derive_more::Error)]
#[display("Invalid email: {email}.\n{source}")]
pub struct InvalidEmail {
    email: String,
    source: BoxedError,
}

impl InvalidEmail {
    pub fn new(
        email: impl Into<String>,
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self {
            email: email.into(),
            source: Box::new(source),
        }
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum SignUpError {
    #[display("Username {username} already in use")]
    UsernameAlreadyInUse { username: String },
    #[display("{_0}")]
    #[from]
    InvalidEmail(#[error(source)] InvalidEmail),
    #[display("Email service unavailable")]
    EmailServiceUnavailable,
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
    #[display("{_0}")]
    #[from]
    Validate(#[error(source)] ValidateCredsError),
}

impl From<DatabaseError> for SignUpError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<SignUpError> for AppError {
    #[track_caller]
    fn from(err: SignUpError) -> Self {
        match err {
            SignUpError::UsernameAlreadyInUse { .. } => {
                Self::conflict(err.to_string())
            }
            SignUpError::InvalidEmail(_) => Self::bad_request(err.to_string()),
            SignUpError::EmailServiceUnavailable => {
                Self::service_unavailable(err.to_string())
            }
            SignUpError::Internal(source) => source.into(),
            SignUpError::Validate(source) => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

impl IntoResponse for SignUpError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum ResendVerificationEmailError {
    #[display("{_0}")]
    #[from]
    InvalidEmail(#[error(source)] InvalidEmail),
    #[display("Email service unavailable")]
    ResendEmailServiceUnavailable,
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl From<DatabaseError> for ResendVerificationEmailError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<ResendVerificationEmailError> for AppError {
    #[track_caller]
    fn from(err: ResendVerificationEmailError) -> Self {
        match err {
            ResendVerificationEmailError::InvalidEmail(_) => {
                Self::bad_request(err.to_string())
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                Self::service_unavailable(err.to_string())
            }
            ResendVerificationEmailError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for ResendVerificationEmailError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum VerifyEmailError {
    #[display("{_0}")]
    #[from]
    InvalidEmail(#[error(source)] InvalidEmail),
    #[display("Invalid or expired verification code")]
    InvalidOrExpiredCode,
    #[display("Too many attempts, please resend verification code")]
    TooManyAttempts,
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl From<DatabaseError> for VerifyEmailError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<VerifyEmailError> for AppError {
    #[track_caller]
    fn from(err: VerifyEmailError) -> Self {
        match err {
            VerifyEmailError::InvalidEmail(_)
            | VerifyEmailError::InvalidOrExpiredCode => {
                Self::bad_request(err.to_string())
            }
            VerifyEmailError::TooManyAttempts => {
                Self::too_many_requests(err.to_string())
            }
            VerifyEmailError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for VerifyEmailError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}
