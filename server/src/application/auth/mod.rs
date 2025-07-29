use std::backtrace::Backtrace;

use axum::http::StatusCode;
use axum_login::{AuthUser, AuthnBackend, UserId};
use derive_more::From;
use macros::{ApiError, IntoErrorSchema};

use crate::domain::model::auth::{
    AuthCredential, AuthnError, ValidateCredsError,
};
use crate::domain::repository::{Connection, Transaction, TransactionManager};
use crate::domain::user::{
    TxRepo, User, {self},
};
use crate::infra::error::Error;

#[derive(Clone)]
pub struct AuthService<R> {
    repo: R,
}

#[derive(Debug, From, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum SignUpError {
    #[error("Username already in use")]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    UsernameAlreadyInUse { backtrace: Backtrace },
    #[error(transparent)]
    #[from(forward)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
    #[error(transparent)]
    #[api_error(
        into_response = self
    )]
    Validate(
        #[from]
        #[backtrace]
        ValidateCredsError,
    ),
}

impl SignUpError {
    pub fn username_already_in_use() -> Self {
        Self::UsernameAlreadyInUse {
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, From, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum SignInError {
    #[error("Already signed in")]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    AlreadySignedIn { backtrace: Backtrace },
    #[error(transparent)]
    Authn(
        #[from]
        #[backtrace]
        AuthnError,
    ),
    #[error(transparent)]
    #[from(forward)]
    Infra {
        #[backtrace]
        source: crate::infra::Error,
    },
    #[error(transparent)]
    Validate(
        #[from]
        #[backtrace]
        ValidateCredsError,
    ),
}

impl SignInError {
    pub fn already_signed_in() -> Self {
        Self::AlreadySignedIn {
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, thiserror::Error, ApiError)]
#[error("Session error: {source}")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self
)]
pub struct SessionError {
    #[from]
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

impl<R> From<axum_login::Error<AuthService<R>>> for SessionBackendError
where
    AuthService<R>: axum_login::AuthnBackend<Error = AuthnBackendError>,
{
    fn from(value: axum_login::Error<AuthService<R>>) -> Self {
        match value {
            axum_login::Error::Session(err) => {
                Self::Session(SessionError::new(err))
            }
            axum_login::Error::Backend(err) => Self::AuthnBackend(err),
        }
    }
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum SessionBackendError {
    #[error(transparent)]
    #[api_error(
        into_response = self
    )]
    Session(
        #[from]
        #[backtrace]
        SessionError,
    ),
    #[error(transparent)]
    AuthnBackend(
        #[from]
        #[backtrace]
        AuthnBackendError,
    ),
}
#[derive(Debug, thiserror::Error, ApiError)]
pub enum AuthnBackendError {
    #[error(transparent)]
    Authn(#[from] AuthnError),
    #[error(transparent)]
    SignIn(#[from] SignInError),
    #[error(transparent)]
    Internal(#[from] Error),
}

pub trait AuthServiceTrait<R>: Send + Sync
where
    R: user::Repository,
{
    async fn sign_in(&self, creds: AuthCredential)
    -> Result<User, SignInError>;

    async fn sign_up(&self, creds: AuthCredential)
    -> Result<User, SignUpError>;
}

impl<R> AuthService<R> {
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }
}

trait AuthServiceTraitBounds<R> = where
    R: TransactionManager + user::Repository,
    R::TransactionRepository: user::TxRepo,
    Error:
        From<R::Error> + From<<R::TransactionRepository as Connection>::Error>;

impl<R> AuthServiceTrait<R> for AuthService<R>
where
    R: TransactionManager + user::Repository,
    R::TransactionRepository: user::TxRepo,
    Error:
        From<R::Error> + From<<R::TransactionRepository as Connection>::Error>,
{
    async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError> {
        let user = self.repo.find_by_name(&creds.username).await?;

        creds
            .verify_credentials(user.as_ref().map(|u| u.password.as_str()))
            .await?;

        Ok(user.ok_or_else(|| AuthnError::AuthenticationFailed {
            backtrace: std::backtrace::Backtrace::capture(),
        })?)
    }

    async fn sign_up(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignUpError> {
        // TODO: Validate in construction
        creds.validate()?;

        if self.repo.find_by_name(&creds.username).await?.is_some() {
            return Err(SignUpError::UsernameAlreadyInUse {
                backtrace: Backtrace::capture(),
            });
        }

        let tx_repo = self.repo.begin().await?;

        let user = tx_repo.create(creds.try_into()?).await?;

        tx_repo.commit().await?;

        Ok(user)
    }
}

impl AuthUser for user::User {
    type Id = i32;
    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

impl<R> AuthnBackend for AuthService<R>
where
    Self: AuthServiceTraitBounds<R>,
    R: Clone + user::Repository,
{
    type User = user::User;
    type Credentials = AuthCredential;
    type Error = AuthnBackendError;

    async fn authenticate(
        &self,
        creds: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        let user = self.sign_in(creds).await?;
        Ok(Some(user))
    }

    async fn get_user(
        &self,
        user_id: &UserId<Self>,
    ) -> Result<Option<Self::User>, Self::Error> {
        self.repo
            .find_by_id(*user_id)
            .await
            .map_err(|e| Error::from(e).into())
    }
}
