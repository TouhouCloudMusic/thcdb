use std::backtrace::Backtrace;

use axum::http::StatusCode;
use axum_login::{AuthUser, AuthnBackend, UserId};
use macros::{ApiError, IntoErrorSchema};

use crate::domain::model::auth::{
    AuthCredential, AuthnError, ValidateCredsError,
};
use crate::domain::repository::{Transaction, TransactionManager};
use crate::domain::user::{
    TxRepo, User, {self},
};
use crate::infra;
use crate::infra::error::Error;

#[derive(Clone)]
pub struct AuthService<R> {
    repo: R,
}

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

impl<R> From<axum_login::Error<AuthService<R>>> for SessionBackendError
where
    AuthService<R>: axum_login::AuthnBackend<Error = AuthnBackendError>,
{
    fn from(value: axum_login::Error<AuthService<R>>) -> Self {
        match value {
            axum_login::Error::Session(err) => Self::Session {
                source: SessionError::new(err),
            },
            axum_login::Error::Backend(err) => {
                Self::AuthnBackend { source: err }
            }
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
    R::TransactionRepository: user::TxRepo;

impl<R> AuthServiceTrait<R> for AuthService<R>
where
    R: TransactionManager + user::Repository,
    R::TransactionRepository: user::TxRepo,
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
            return Err(SignUpError::UsernameAlreadyInUse);
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
