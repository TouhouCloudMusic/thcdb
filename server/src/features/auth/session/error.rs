use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};

use crate::domain::auth::{AuthnError, ValidateCredsError};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;
use crate::shared::types::BoxedError;

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
            SignInError::Internal { source } => Self::internal_boxed(source.0),
            SignInError::Validate { source } => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

impl From<BoxedError> for SignInError {
    fn from(source: BoxedError) -> Self {
        Self::Internal {
            source: InternalError(source),
        }
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

impl IntoResponse for SessionError {
    fn into_response(self) -> axum::response::Response {
        AppError::internal(self).into_response()
    }
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
            AuthnBackendError::Internal { source } => {
                AppError::internal_boxed(source.0)
            }
        }
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

impl From<BoxedError> for AuthnBackendError {
    fn from(source: BoxedError) -> Self {
        Self::Internal {
            source: InternalError(source),
        }
    }
}

fn app_error_from_authn_error(err: AuthnError) -> AppError {
    match err {
        AuthnError::AuthenticationFailed => {
            AppError::unauthorized(err.to_string())
        }
        AuthnError::Internal(source) => AppError::internal_boxed(source.0),
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
