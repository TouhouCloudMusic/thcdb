use axum_login::{AuthUser, AuthnBackend, UserId};

use super::error::{
    AuthnBackendError, SessionBackendError, SessionError, SignInError,
};
use crate::domain::auth::{AuthCredential, AuthnError};
use crate::domain::user::{self, User};
use crate::features::auth::{Email, Service, repo};
use crate::infra::error::Error;

impl Service {
    pub async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError> {
        let email = Email::parse(&creds.username).ok();
        let user = if let Some(email) = email {
            repo::find_by_email(&self.repo.conn, &email).await?
        } else {
            repo::find_by_name(&self.repo.conn, &creds.username).await?
        };

        creds
            .verify_credentials(user.as_ref().map(|u| u.password.as_str()))
            .await?;

        let user = user.ok_or_else(AuthnError::authentication_failed)?;

        if !user.email_verified {
            return Err(SignInError::EmailNotVerified);
        }

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
