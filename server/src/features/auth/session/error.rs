use std::backtrace::Backtrace;

use axum::response::IntoResponse;

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::infra::error::Error;
use crate::shared::http::api_response::AppError;

#[derive(Debug, snafu::Snafu)]
pub enum SignInError {
    #[snafu(display("Already signed in"))]
    AlreadySignedIn,
    #[snafu(display("Email not verified"))]
    EmailNotVerified,
    #[snafu(transparent)]
    Authn { source: AuthnError },
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl IntoResponse for SignInError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<SignInError> for AppError {
    #[track_caller]
    fn from(err: SignInError) -> Self {
        match err {
            SignInError::AlreadySignedIn => {
                Self::bad_request("Already signed in")
            }
            SignInError::EmailNotVerified => {
                Self::bad_request("Email not verified")
            }
            SignInError::Authn { source } => app_error_from_authn_error(source),
            SignInError::Database { source } => source.into(),
            SignInError::Infra { source } => source.into(),
            SignInError::Validate { source } => {
                Self::bad_request(source.to_string())
            }
        }
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
        AppError::from(self).into_response()
    }
}

impl From<SessionBackendError> for AppError {
    #[track_caller]
    fn from(err: SessionBackendError) -> Self {
        match err {
            SessionBackendError::Session { source } => Self::internal(source),
            SessionBackendError::AuthnBackend { source } => source.into(),
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
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Internal { source: Error },
}

impl IntoResponse for AuthnBackendError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<AuthnBackendError> for AppError {
    #[track_caller]
    fn from(err: AuthnBackendError) -> Self {
        match err {
            AuthnBackendError::Authn { source } => {
                app_error_from_authn_error(source)
            }
            AuthnBackendError::SignIn { source } => source.into(),
            AuthnBackendError::Database { source } => source.into(),
            AuthnBackendError::Internal { source } => source.into(),
        }
    }
}

fn app_error_from_authn_error(err: AuthnError) -> AppError {
    let message = err.to_string();
    match err {
        AuthnError::AuthenticationFailed { .. } => {
            AppError::unauthorized(message)
        }
        AuthnError::Infra { source } => source.into(),
        err @ (AuthnError::PasswordHash { .. } | AuthnError::Join { .. }) => {
            AppError::internal(err)
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
                SignInError::AlreadySignedIn
                | SignInError::Database { .. }
                | SignInError::Infra { .. } => false,
            },
            AuthnBackendError::Database { .. }
            | AuthnBackendError::Internal { .. } => false,
        }
    }
}
