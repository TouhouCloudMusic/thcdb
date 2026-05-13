use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::features::user_profile;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Display, DeriveError)]
pub enum SignInError {
    #[display("Already signed in")]
    AlreadySignedIn,
    #[display("Email not verified")]
    EmailNotVerified,
    #[display("{source}")]
    Authn {
        #[error(source)]
        source: AuthnError,
    },
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

#[derive(Debug, Display, DeriveError)]
pub enum SignInRouteError {
    #[display("{source}")]
    SignIn {
        #[error(source)]
        source: SignInError,
    },
    #[display("{source}")]
    Session {
        #[error(source)]
        source: SessionBackendError,
    },
    #[display("{source}")]
    Profile {
        #[error(source)]
        source: user_profile::Error,
    },
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
            SignInError::Authn { source } => source.into(),
            SignInError::Internal { source } => source.into(),
            SignInError::Validate { source } => {
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

impl From<SignInError> for SignInRouteError {
    fn from(source: SignInError) -> Self {
        Self::SignIn { source }
    }
}

impl From<SessionBackendError> for SignInRouteError {
    fn from(source: SessionBackendError) -> Self {
        Self::Session { source }
    }
}

impl From<user_profile::Error> for SignInRouteError {
    fn from(source: user_profile::Error) -> Self {
        Self::Profile { source }
    }
}

impl From<SignInRouteError> for AppError {
    #[track_caller]
    fn from(err: SignInRouteError) -> Self {
        match err {
            SignInRouteError::SignIn { source } => source.into(),
            SignInRouteError::Session { source } => source.into(),
            SignInRouteError::Profile { source } => source.into(),
        }
    }
}

impl IntoResponse for SignInRouteError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<AuthnError> for SignInError {
    fn from(source: AuthnError) -> Self {
        Self::Authn { source }
    }
}

impl From<DatabaseError> for SignInError {
    fn from(source: DatabaseError) -> Self {
        Self::Internal {
            source: InternalError::new(source),
        }
    }
}

impl From<ValidateCredsError> for SignInError {
    fn from(source: ValidateCredsError) -> Self {
        Self::Validate { source }
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

#[derive(Debug, Display, DeriveError)]
pub enum SessionBackendError {
    #[display("{source}")]
    Session {
        #[error(source)]
        source: SessionError,
    },
    #[display("{source}")]
    AuthnBackend {
        #[error(source)]
        source: AuthnBackendError,
    },
}

impl From<SessionBackendError> for AppError {
    #[track_caller]
    fn from(err: SessionBackendError) -> Self {
        match err {
            SessionBackendError::Session { source } => source.into(),
            SessionBackendError::AuthnBackend { source } => source.into(),
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

#[derive(Debug, Display, DeriveError)]
pub enum AuthnBackendError {
    #[display("{source}")]
    Authn {
        #[error(source)]
        source: AuthnError,
    },
    #[display("{source}")]
    SignIn {
        #[error(source)]
        source: SignInError,
    },
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
}

impl From<AuthnBackendError> for AppError {
    #[track_caller]
    fn from(err: AuthnBackendError) -> Self {
        match err {
            AuthnBackendError::Authn { source } => source.into(),
            AuthnBackendError::SignIn { source } => source.into(),
            AuthnBackendError::Internal { source } => source.into(),
        }
    }
}

impl IntoResponse for AuthnBackendError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

impl From<AuthnError> for AuthnBackendError {
    fn from(source: AuthnError) -> Self {
        Self::Authn { source }
    }
}

impl From<SignInError> for AuthnBackendError {
    fn from(source: SignInError) -> Self {
        Self::SignIn { source }
    }
}

impl From<DatabaseError> for AuthnBackendError {
    fn from(source: DatabaseError) -> Self {
        Self::Internal {
            source: InternalError::new(source),
        }
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
            AuthnBackendError::Authn { source } => {
                matches!(source, AuthnError::AuthenticationFailed)
            }
            AuthnBackendError::SignIn { source } => match source {
                SignInError::EmailNotVerified
                | SignInError::Validate { .. } => true,
                SignInError::Authn { source } => {
                    matches!(source, AuthnError::AuthenticationFailed)
                }
                SignInError::AlreadySignedIn | SignInError::Internal { .. } => {
                    false
                }
            },
            AuthnBackendError::Internal { .. } => false,
        }
    }
}
