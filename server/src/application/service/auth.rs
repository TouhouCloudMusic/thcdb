use ::core::future::Future;
use ::core::marker::Send;
use ::core::pin::Pin;
use argon2::password_hash;
use axum::http::StatusCode;
use axum_login::{AuthUser, AuthnBackend, UserId};
use derive_more::{Display, From};
use futures_util::{FutureExt, TryFutureExt};
use macros::{ApiError, IntoErrorSchema};
use thiserror::Error;

use crate::domain;
use crate::domain::model::auth::{
    AuthCredential, AuthnError, HasherError, ValidateCredsError,
};
use crate::domain::model::user::User;
use crate::error::{ErrorCode, ImpledApiError};

#[derive(Clone)]
pub struct AuthService<R> {
    repo: R,
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema, From)]
pub enum SignUpError<R>
where
    R: ImpledApiError,
{
    #[error("Username already in use")]
    #[api_error(
        status_code = StatusCode::CONFLICT,
        error_code = ErrorCode::UsernameAlreadyInUse
    )]
    UsernameAlreadyInUse,
    #[error(transparent)]
    Repo(R),
    #[api_error(
        into_response = self
    )]
    #[error(transparent)]
    #[from(password_hash::Error)]
    Hash(HasherError),
    #[error(transparent)]
    #[from(ValidateCredsError)]
    Validate(ValidateCredsError),
}

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum SignInError<R>
where
    R: ImpledApiError,
{
    #[api_error(
            status_code = StatusCode::CONFLICT,
            error_code = ErrorCode::AlreadySignedIn,
    )]
    #[error("Already signed in")]
    AlreadySignedIn,
    #[error(transparent)]
    Authn(#[from] AuthnError),
    #[error(transparent)]
    Repo(R),
    #[error(transparent)]
    Validate(#[from] ValidateCredsError),
}

#[derive(Debug, Display, ApiError, From, Error)]
#[display("Session error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    error_code = ErrorCode::InternalServerError,
    into_response = self
)]
pub struct SessionError(axum_login::tower_sessions::session::Error);

impl<R> From<axum_login::Error<AuthService<R>>>
    for SessionBackendError<R::Error>
where
    R: domain::repository::user::Repository,
    R::Error: ImpledApiError,
    AuthService<R>: axum_login::AuthnBackend,
    <AuthService<R> as axum_login::AuthnBackend>::Error:
        Into<AuthnBackendError<R::Error>>,
{
    fn from(value: axum_login::Error<AuthService<R>>) -> Self {
        match value {
            axum_login::Error::Session(err) => Self::Session(SessionError(err)),
            axum_login::Error::Backend(err) => Self::AuthnBackend(err.into()),
        }
    }
}

error_set::error_set! {
    #[derive(ApiError, IntoErrorSchema)]
    #[disable(From)]
    SessionBackendError<R: ImpledApiError> = {
        #[api_error(
            into_response = self
        )]
        Session(SessionError),
        AuthnBackend(AuthnBackendError<R>)
    };
}
#[derive(thiserror::Error, ApiError, Debug)]
pub enum AuthnBackendError<R>
where
    R: ImpledApiError,
{
    #[error(transparent)]
    Authn(AuthnError),
    #[error(transparent)]
    SignIn(#[from] SignInError<R>),
    #[error(transparent)]
    Repo(R),
}

pub trait AuthServiceTrait<R>: Send + Sync
where
    R: domain::repository::user::Repository,
    R::Error: ImpledApiError,
{
    async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError<R::Error>>;

    async fn sign_up(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignUpError<R::Error>>;
}

impl<R> AuthService<R>
where
    R: domain::repository::user::Repository,
{
    pub const fn new(repo: R) -> Self {
        Self { repo }
    }
}

impl<R> AuthServiceTrait<R> for AuthService<R>
where
    R: domain::repository::user::Repository,
    R::Error: ImpledApiError,
{
    async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError<R::Error>> {
        let user = self
            .repo
            .find_by_name(&creds.username)
            .await
            .map_err(SignInError::Repo)?;

        creds
            .verify_credentials(user.as_ref().map(|u| u.password.as_str()))
            .await?;

        Ok(user.ok_or(AuthnError::AuthenticationFailed)?)
    }

    async fn sign_up(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignUpError<R::Error>> {
        creds.validate()?;

        self.repo
            .find_by_name(&creds.username)
            .await
            .map_err(SignUpError::Repo)?
            .map_or(Ok(()), |_| Err(SignUpError::UsernameAlreadyInUse))?;

        self.repo
            .save(creds.try_into()?)
            .await
            .map_err(SignUpError::Repo)
    }
}

impl AuthUser for domain::model::user::User {
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
    R: Clone + domain::repository::user::Repository,
    R::Error: ImpledApiError + Send + Sync,
    for<'a> R::find_by_id(..): Send,
    for<'a> R::find_by_name(..): Send,
{
    type User = domain::model::user::User;
    type Credentials = AuthCredential;
    type Error = AuthnBackendError<R::Error>;

    fn authenticate<'life0, 'async_trait>(
        &'life0 self,
        creds: Self::Credentials,
    ) -> Pin<
        Box<
            dyn Future<Output = Result<Option<Self::User>, Self::Error>>
                + Send
                + 'async_trait,
        >,
    >
    where
        'life0: 'async_trait,
        Self: 'async_trait,
    {
        async {
            let user = self.sign_in(creds).await?;
            Ok(Some(user))
        }
        .boxed()
    }

    fn get_user<'life0, 'life1, 'async_trait>(
        &'life0 self,
        user_id: &'life1 UserId<Self>,
    ) -> Pin<
        Box<
            dyn Future<Output = Result<Option<Self::User>, Self::Error>>
                + Send
                + 'async_trait,
        >,
    >
    where
        'life0: 'async_trait,
        'life1: 'async_trait,
        Self: 'async_trait,
    {
        self.repo
            .find_by_id(*user_id)
            .map_err(AuthnBackendError::Repo)
            .boxed()
    }
}
