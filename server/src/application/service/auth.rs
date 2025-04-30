use async_trait::async_trait;
use axum::http::StatusCode;
use axum_login::{AuthUser, AuthnBackend, UserId};
use derive_more::{Display, From};
use macros::{ApiError, IntoErrorSchema};
use thiserror::Error;

use crate::domain::model::auth::{
    AuthCredential, AuthnError, ValidateCredsError,
};
use crate::domain::repository::{
    RepositoryTrait, TransactionManager, TransactionRepositoryTrait,
};
use crate::domain::user::{self, TransactionRepository, User};
use crate::error::InfraError;

#[derive(Clone)]
pub struct AuthService<R> {
    repo: R,
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema, From)]
pub enum SignUpError {
    #[error("Username already in use")]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    UsernameAlreadyInUse,
    #[error(transparent)]
    #[from(forward)]
    Internal(InfraError),
    #[api_error(
        into_response = self
    )]
    #[error(transparent)]
    #[from(ValidateCredsError)]
    Validate(ValidateCredsError),
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema, From)]
pub enum SignInError {
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    #[error("Already signed in")]
    AlreadySignedIn,
    #[error(transparent)]
    Authn(#[from] AuthnError),
    #[error(transparent)]
    #[from(forward)]
    Internal(InfraError),
    #[error(transparent)]
    Validate(#[from] ValidateCredsError),
}

#[derive(Debug, Display, ApiError, From, Error)]
#[display("Session error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self
)]
pub struct SessionError(axum_login::tower_sessions::session::Error);

impl<R> From<axum_login::Error<AuthService<R>>> for SessionBackendError
where
    AuthService<R>: axum_login::AuthnBackend<Error = AuthnBackendError>,
{
    fn from(value: axum_login::Error<AuthService<R>>) -> Self {
        match value {
            axum_login::Error::Session(err) => Self::Session(SessionError(err)),
            axum_login::Error::Backend(err) => Self::AuthnBackend(err),
        }
    }
}

error_set::error_set! {
    #[derive(ApiError, IntoErrorSchema)]
    SessionBackendError = {
        #[api_error(
            into_response = self
        )]
        Session(SessionError),
        AuthnBackend(AuthnBackendError)
    };
}
#[derive(Debug, thiserror::Error, ApiError)]
pub enum AuthnBackendError {
    #[error(transparent)]
    Authn(#[from] AuthnError),
    #[error(transparent)]
    SignIn(#[from] SignInError),
    #[error(transparent)]
    Internal(#[from] InfraError),
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
    R::TransactionRepository: user::TransactionRepository,
    InfraError: From<R::Error>
        + From<<R::TransactionRepository as RepositoryTrait>::Error>;

impl<R> AuthServiceTrait<R> for AuthService<R>
where
    R: TransactionManager + user::Repository,
    R::TransactionRepository: user::TransactionRepository,
    InfraError: From<R::Error>
        + From<<R::TransactionRepository as RepositoryTrait>::Error>,
{
    async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError> {
        let user = self.repo.find_by_name(&creds.username).await?;

        creds
            .verify_credentials(user.as_ref().map(|u| u.password.as_str()))
            .await?;

        Ok(user.ok_or(AuthnError::AuthenticationFailed)?)
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

#[async_trait]
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
            .map_err(|e| InfraError::from(e).into())
    }
}
