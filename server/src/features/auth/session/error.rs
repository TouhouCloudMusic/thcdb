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

impl IntoResponse for SignInError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SignInError::AlreadySignedIn => {
                AppError::bad_request("Already signed in").into_response()
            }
            SignInError::EmailNotVerified => {
                AppError::bad_request("Email not verified").into_response()
            }
            SignInError::Authn(source) => source.into_response(),
            SignInError::Internal(source) => source.into_response(),
            SignInError::Validate(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
        }
    }
}

impl IntoResponse for SignInRouteError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SignInRouteError::SignIn(source) => source.into_response(),
            SignInRouteError::Session(source) => source.into_response(),
            SignInRouteError::Profile(source) => source.into_response(),
        }
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

impl IntoResponse for SessionBackendError {
    fn into_response(self) -> axum::response::Response {
        match self {
            SessionBackendError::Session(source) => source.into_response(),
            SessionBackendError::AuthnBackend(source) => source.into_response(),
        }
    }
}

impl IntoResponse for SessionError {
    fn into_response(self) -> axum::response::Response {
        InternalError::new(self).into_response()
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

impl IntoResponse for AuthnBackendError {
    fn into_response(self) -> axum::response::Response {
        match self {
            AuthnBackendError::Authn(source) => source.into_response(),
            AuthnBackendError::SignIn(source) => source.into_response(),
            AuthnBackendError::Internal(source) => source.into_response(),
        }
    }
}

impl From<DatabaseError> for AuthnBackendError {
    fn from(source: DatabaseError) -> Self {
        Self::Internal(InternalError::new(source))
    }
}

impl IntoResponse for AuthnError {
    fn into_response(self) -> axum::response::Response {
        match self {
            AuthnError::AuthenticationFailed => {
                AppError::unauthorized(self.to_string()).into_response()
            }
            AuthnError::Internal(source) => source.into_response(),
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
