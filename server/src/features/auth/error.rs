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

impl IntoResponse for SignUpError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SignUpError::UsernameAlreadyInUse { username } => {
                AppError::conflict(format!(
                    "Username {username} already in use"
                ))
                .into_response()
            }
            SignUpError::InvalidEmail(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
            SignUpError::EmailServiceUnavailable => {
                AppError::service_unavailable("Email service unavailable")
                    .into_response()
            }
            SignUpError::Internal(source) => source.into_response(),
            SignUpError::Validate(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
        }
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

impl IntoResponse for ResendVerificationEmailError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ResendVerificationEmailError::InvalidEmail(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                AppError::service_unavailable("Email service unavailable")
                    .into_response()
            }
            ResendVerificationEmailError::Internal(source) => {
                source.into_response()
            }
        }
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

impl IntoResponse for VerifyEmailError {
    fn into_response(self) -> axum::response::Response {
        match self {
            VerifyEmailError::InvalidEmail(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
            VerifyEmailError::InvalidOrExpiredCode => {
                AppError::bad_request("Invalid or expired verification code")
                    .into_response()
            }
            VerifyEmailError::TooManyAttempts => AppError::too_many_requests(
                "Too many attempts, please resend verification code",
            )
            .into_response(),
            VerifyEmailError::Internal(source) => source.into_response(),
        }
    }
}
