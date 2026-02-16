use std::backtrace::Backtrace;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;
use macros::ApiError;

use crate::adapter::inbound::rest::api_response::{
    self, ApiError as ApiErrorTrait,
};
use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::infra;
use crate::infra::error::Error;

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
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl SignUpError {
    fn status_code(&self) -> StatusCode {
        match self {
            SignUpError::UsernameAlreadyInUse { .. } => StatusCode::CONFLICT,
            SignUpError::InvalidEmail { .. } => StatusCode::BAD_REQUEST,
            SignUpError::EmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            SignUpError::Infra { source } => source.as_status_code(),
            SignUpError::Validate { source } => source.as_status_code(),
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
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(self, status_code)
            .into_response()
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum SignInError {
    #[snafu(display("Already signed in"))]
    AlreadySignedIn,
    #[snafu(display("Email not verified"))]
    EmailNotVerified,
    #[snafu(transparent)]
    Authn { source: AuthnError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl IntoResponse for SignInError {
    fn into_response(self) -> axum::response::Response {
        let status_code = match &self {
            SignInError::AlreadySignedIn | SignInError::EmailNotVerified => {
                StatusCode::BAD_REQUEST
            }
            SignInError::Authn { source } => source.status_code(),
            SignInError::Infra { source } => source.as_status_code(),
            SignInError::Validate { source } => source.as_status_code(),
        };
        api_response::Error::from_err_and_code(self, status_code)
            .into_response()
    }
}

impl<E> From<E> for SignInError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError)]
#[snafu(display("Session error: {source}"))]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self
)]
pub struct SessionError {
    source: axum_login::tower_sessions::session::Error,
    backtrace: Backtrace,
}

impl SessionError {
    pub fn new(source: axum_login::tower_sessions::session::Error) -> Self {
        Self {
            source,
            backtrace: Backtrace::force_capture(),
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum SessionBackendError {
    #[snafu(transparent)]
    Session { source: SessionError },
    #[snafu(transparent)]
    AuthnBackend { source: AuthnBackendError },
}

impl IntoResponse for SessionBackendError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SessionBackendError::Session { source } => source.into_response(),
            SessionBackendError::AuthnBackend { source } => {
                source.into_response()
            }
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum AuthnBackendError {
    #[snafu(transparent)]
    Authn { source: AuthnError },
    #[snafu(transparent)]
    SignIn { source: SignInError },
    #[snafu(transparent)]
    Internal { source: Error },
}

impl IntoResponse for AuthnBackendError {
    fn into_response(self) -> axum::response::Response {
        match self {
            AuthnBackendError::Authn { source } => source.into_response(),
            AuthnBackendError::SignIn { source } => source.into_response(),
            AuthnBackendError::Internal { source } => {
                let status_code = source.as_status_code();
                api_response::Error::from_err_and_code(source, status_code)
                    .into_response()
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
    Infra { source: infra::Error },
}

impl ResendVerificationEmailError {
    fn status_code(&self) -> StatusCode {
        match self {
            ResendVerificationEmailError::InvalidEmail { .. } => {
                StatusCode::BAD_REQUEST
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            ResendVerificationEmailError::Infra { source } => {
                source.as_status_code()
            }
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
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(self, status_code)
            .into_response()
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
    Infra { source: infra::Error },
}

impl VerifyEmailError {
    fn status_code(&self) -> StatusCode {
        match self {
            VerifyEmailError::InvalidEmail { .. }
            | VerifyEmailError::InvalidOrExpiredCode => StatusCode::BAD_REQUEST,
            VerifyEmailError::TooManyAttempts => StatusCode::TOO_MANY_REQUESTS,
            VerifyEmailError::Infra { source } => source.as_status_code(),
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
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(self, status_code)
            .into_response()
    }
}
