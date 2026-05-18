use axum_login::{AuthUser, AuthnBackend, UserId};

use super::error::{
    AuthnBackendError, SessionBackendError, SessionError, SignInError,
};
use crate::features::auth::{AuthCredential, AuthnError, Email, Service, repo};
use crate::features::user::User;

impl Service {
    pub async fn sign_in(
        &self,
        creds: AuthCredential,
    ) -> Result<User, SignInError> {
        let user = match SignInIdentifier::parse(&creds.username) {
            SignInIdentifier::Email(email) => {
                repo::find_by_email(&self.repo.conn, &email).await?
            }
            SignInIdentifier::Username(username) => {
                repo::find_by_name(&self.repo.conn, &username).await?
            }
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

enum SignInIdentifier {
    Email(Email),
    Username(String),
}

impl SignInIdentifier {
    fn parse(input: &str) -> Self {
        Email::parse(input)
            .map_or_else(|_| Self::Username(input.to_string()), Self::Email)
    }
}

impl From<axum_login::Error<Service>> for SessionBackendError {
    fn from(value: axum_login::Error<Service>) -> Self {
        match value {
            axum_login::Error::Session(err) => {
                Self::Session(SessionError::new(err))
            }
            axum_login::Error::Backend(err) => Self::AuthnBackend(err),
        }
    }
}

impl AuthUser for User {
    type Id = i32;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        self.password.as_bytes()
    }
}

impl AuthnBackend for Service {
    type User = User;
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
            .map_err(Into::into)
    }
}

#[cfg(test)]
mod tests {
    use super::SignInIdentifier;

    #[test]
    fn parses_email_identifier() {
        let identifier = SignInIdentifier::parse("Alice@example.com");

        assert!(matches!(identifier, SignInIdentifier::Email(_)));
    }

    #[test]
    fn keeps_non_email_identifier_as_username() {
        let identifier = SignInIdentifier::parse("Alice");

        assert!(matches!(
            identifier,
            SignInIdentifier::Username(username) if username == "Alice"
        ));
    }
}
