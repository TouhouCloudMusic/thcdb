use std::backtrace::Backtrace;

use axum::http::StatusCode;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::infra;
use crate::infra::error::Error;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum SignUpError {
    #[snafu(display("Username already in use"))]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    UsernameAlreadyInUse,
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    #[api_error(
        into_response = self
    )]
    Validate { source: ValidateCredsError },
}

impl<E> From<E> for SignUpError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum SignInError {
    #[snafu(display("Already signed in"))]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    AlreadySignedIn,
    #[snafu(transparent)]
    Authn { source: AuthnError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl SignInError {
    pub const fn already_signed_in() -> Self {
        Self::AlreadySignedIn
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

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum SessionBackendError {
    #[snafu(transparent)]
    Session { source: SessionError },
    #[snafu(transparent)]
    AuthnBackend { source: AuthnBackendError },
}

#[derive(Debug, snafu::Snafu, ApiError)]
pub enum AuthnBackendError {
    #[snafu(transparent)]
    Authn { source: AuthnError },
    #[snafu(transparent)]
    SignIn { source: SignInError },
    #[snafu(transparent)]
    Internal { source: Error },
}
