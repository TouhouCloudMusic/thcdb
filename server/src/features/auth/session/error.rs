use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError, From};

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::features::user_profile;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Display, DeriveError, From)]
pub enum SignInError {
    #[display("Already signed in")]
    AlreadySignedIn,
    #[display("Email not verified")]
    EmailNotVerified,
    #[display("{_0}")]
    #[from]
    Authn(#[error(source)] AuthnError),
    #[display("{_0}")]
    Internal(#[error(source)] InternalError),
    #[display("{_0}")]
    #[from]
    Validate(#[error(source)] ValidateCredsError),
}

#[derive(Debug, Display, DeriveError, From)]
pub enum SignInRouteError {
    #[display("{_0}")]
    #[from]
    SignIn(#[error(source)] SignInError),
    #[display("{_0}")]
    #[from]
    Session(#[error(source)] SessionBackendError),
    #[display("{_0}")]
    #[from]
    Profile(#[error(source)] user_profile::Error),
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
            SignInError::Authn(source) => source.into(),
            SignInError::Internal(source) => source.into(),
            SignInError::Validate(source) => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

impl IntoResponse for SignInError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<SignInRouteError> for AppError {
    #[track_caller]
    fn from(err: SignInRouteError) -> Self {
        match err {
            SignInRouteError::SignIn(source) => source.into(),
            SignInRouteError::Session(source) => source.into(),
            SignInRouteError::Profile(source) => source.into(),
        }
    }
}

impl IntoResponse for SignInRouteError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<DatabaseError> for SignInError {
    fn from(source: DatabaseError) -> Self {
        Self::Internal(InternalError::new(source))
    }
}

#[derive(Debug, Display, DeriveError)]
#[display("Session error: {source}")]
pub struct SessionError {
    #[error(source)]
    source: axum_login::tower_sessions::session::Error,
}

impl SessionError {
    pub const fn new(
        source: axum_login::tower_sessions::session::Error,
    ) -> Self {
        Self { source }
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum SessionBackendError {
    #[display("{_0}")]
    #[from]
    Session(#[error(source)] SessionError),
    #[display("{_0}")]
    #[from]
    AuthnBackend(#[error(source)] AuthnBackendError),
}

impl From<SessionBackendError> for AppError {
    #[track_caller]
    fn from(err: SessionBackendError) -> Self {
        match err {
            SessionBackendError::Session(source) => source.into(),
            SessionBackendError::AuthnBackend(source) => source.into(),
        }
    }
}

impl IntoResponse for SessionBackendError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<SessionError> for AppError {
    #[track_caller]
    fn from(err: SessionError) -> Self {
        Self::internal(err)
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum AuthnBackendError {
    #[display("{_0}")]
    #[from]
    Authn(#[error(source)] AuthnError),
    #[display("{_0}")]
    #[from]
    SignIn(#[error(source)] SignInError),
    #[display("{_0}")]
    Internal(#[error(source)] InternalError),
}

impl From<AuthnBackendError> for AppError {
    #[track_caller]
    fn from(err: AuthnBackendError) -> Self {
        match err {
            AuthnBackendError::Authn(source) => source.into(),
            AuthnBackendError::SignIn(source) => source.into(),
            AuthnBackendError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for AuthnBackendError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<DatabaseError> for AuthnBackendError {
    fn from(source: DatabaseError) -> Self {
        Self::Internal(InternalError::new(source))
    }
}

impl From<AuthnError> for AppError {
    #[track_caller]
    fn from(err: AuthnError) -> Self {
        match err {
            AuthnError::AuthenticationFailed => {
                AppError::unauthorized(err.to_string())
            }
            AuthnError::Internal(source) => source.into(),
        }
    }
}

impl crate::adapter::inbound::rest::AuthRejection for AuthnBackendError {
    fn is_auth_rejection(&self) -> bool {
        match self {
            AuthnBackendError::Authn(source) => {
                matches!(source, AuthnError::AuthenticationFailed)
            }
            AuthnBackendError::SignIn(source) => match source {
                SignInError::EmailNotVerified | SignInError::Validate(_) => {
                    true
                }
                SignInError::Authn(source) => {
                    matches!(source, AuthnError::AuthenticationFailed)
                }
                SignInError::AlreadySignedIn | SignInError::Internal(_) => {
                    false
                }
            },
            AuthnBackendError::Internal(_) => false,
        }
    }
}
