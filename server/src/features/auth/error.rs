use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;
use sea_orm::DbErr;

use crate::domain::auth::ValidateCredsError;
use crate::infra;
use crate::infra::database::error::DatabaseError;
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

#[derive(Debug, snafu::Snafu)]
#[snafu(visibility(pub(super)))]
pub enum SignUpError {
    #[snafu(display("Username {username} already in use"))]
    UsernameAlreadyInUse { username: String },
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Email service unavailable"))]
    EmailServiceUnavailable,
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl SignUpError {
    const fn status_code(&self) -> StatusCode {
        match self {
            SignUpError::UsernameAlreadyInUse { .. } => StatusCode::CONFLICT,
            SignUpError::InvalidEmail { .. } | SignUpError::Validate { .. } => {
                StatusCode::BAD_REQUEST
            }
            SignUpError::EmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            SignUpError::Database { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            SignUpError::Infra { source } => source.status_code(),
        }
    }
}

impl From<DbErr> for SignUpError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("auth sign-up database operation"),
        }
    }
}

impl<E> From<E> for SignUpError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
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
            SignUpError::Database { source } => source.into(),
            SignUpError::Infra { source } => source.into(),
            SignUpError::Validate { source } => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum ResendVerificationEmailError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Email service unavailable"))]
    ResendEmailServiceUnavailable,
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl ResendVerificationEmailError {
    const fn status_code(&self) -> StatusCode {
        match self {
            ResendVerificationEmailError::InvalidEmail { .. } => {
                StatusCode::BAD_REQUEST
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            ResendVerificationEmailError::Database { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            ResendVerificationEmailError::Infra { source } => {
                source.status_code()
            }
        }
    }
}

impl From<DbErr> for ResendVerificationEmailError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err).with_operation(
                "auth resend verification email database operation",
            ),
        }
    }
}

impl<E> From<E> for ResendVerificationEmailError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
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
            ResendVerificationEmailError::Database { source } => source.into(),
            ResendVerificationEmailError::Infra { source } => source.into(),
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum VerifyEmailError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Invalid or expired verification code"))]
    InvalidOrExpiredCode,
    #[snafu(display("Too many attempts, please resend verification code"))]
    TooManyAttempts,
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl VerifyEmailError {
    const fn status_code(&self) -> StatusCode {
        match self {
            VerifyEmailError::InvalidEmail { .. }
            | VerifyEmailError::InvalidOrExpiredCode => StatusCode::BAD_REQUEST,
            VerifyEmailError::TooManyAttempts => StatusCode::TOO_MANY_REQUESTS,
            VerifyEmailError::Database { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            VerifyEmailError::Infra { source } => source.status_code(),
        }
    }
}

impl From<DbErr> for VerifyEmailError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("auth verify email database operation"),
        }
    }
}

impl<E> From<E> for VerifyEmailError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
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
            VerifyEmailError::Database { source } => source.into(),
            VerifyEmailError::Infra { source } => source.into(),
        }
    }
}
