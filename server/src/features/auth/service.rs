use axum_login::{AuthUser, AuthnBackend, UserId};
use sea_orm::TransactionTrait;

use super::error::{
    AuthnBackendError, SessionBackendError, SessionError, SignInError,
    SignUpError,
};
use super::repo;
use crate::domain::auth::{AuthCredential, AuthnError};
use crate::domain::user::{self, User};
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::infra::error::Error;

#[derive(Clone)]
pub struct Service {
    repo: SeaOrmRepository,
}

impl Service {
    pub const fn new(repo: SeaOrmRepository) -> Self {
        Self { repo }
    }

    pub async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError> {
        let user = repo::find_by_name(&self.repo.conn, &creds.username).await?;

        creds
            .verify_credentials(user.as_ref().map(|u| u.password.as_str()))
            .await?;

        Ok(user.ok_or_else(|| AuthnError::AuthenticationFailed {
            backtrace: std::backtrace::Backtrace::capture(),
        })?)
    }

    pub async fn sign_up(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignUpError> {
        creds.validate()?;

        if repo::find_by_name(&self.repo.conn, &creds.username)
            .await?
            .is_some()
        {
            return Err(SignUpError::UsernameAlreadyInUse);
        }

        let tx = self.repo.conn.begin().await?;

        let user = repo::create_user(&tx, creds.try_into()?).await?;

        tx.commit().await?;

        Ok(user)
    }
}

impl From<axum_login::Error<Service>> for SessionBackendError {
    fn from(value: axum_login::Error<Service>) -> Self {
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

impl AuthUser for user::User {
    type Id = i32;
    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

impl AuthnBackend for Service {
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
        repo::find_by_id(&self.repo.conn, *user_id)
            .await
            .map_err(|e| Error::from(e).into())
    }
}
