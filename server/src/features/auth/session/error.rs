use std::backtrace::Backtrace;

use axum::http::StatusCode;
use axum::response::IntoResponse;

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::infra;
use crate::infra::error::Error;
use crate::shared::http::api_response::{self, AppError};

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
            SignInError::Infra { source } => source.status_code(),
            SignInError::Validate { .. } => ValidateCredsError::status_code(),
        };
        api_response::Error::from_err_and_code(&self, status_code)
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

#[derive(Debug, snafu::Snafu)]
#[snafu(display("Session error: {source}"))]
pub struct SessionError {
    source: axum_login::tower_sessions::session::Error,
    backtrace: Backtrace,
}

impl IntoResponse for SessionError {
    fn into_response(self) -> axum::response::Response {
        AppError::internal(self).into_response()
    }
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
                let status_code = source.status_code();
                api_response::Error::from_err_and_code(&source, status_code)
                    .into_response()
            }
        }
    }
}

impl crate::adapter::inbound::rest::AuthRejection for AuthnBackendError {
    fn is_auth_rejection(&self) -> bool {
        match self {
            AuthnBackendError::Authn { source } => {
                matches!(source, AuthnError::AuthenticationFailed { .. })
            }
            AuthnBackendError::SignIn { source } => match source {
                SignInError::EmailNotVerified
                | SignInError::Validate { .. } => true,
                SignInError::Authn { source } => {
                    matches!(source, AuthnError::AuthenticationFailed { .. })
                }
                SignInError::AlreadySignedIn | SignInError::Infra { .. } => {
                    false
                }
            },
            AuthnBackendError::Internal { .. } => false,
        }
    }
}
