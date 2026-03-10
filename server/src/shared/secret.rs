use std::panic::Location;

use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordVerifier, SaltString};
use argon2::{Argon2, PasswordHasher as _};

#[track_caller]
#[expect(clippy::manual_async_fn, reason = "track_caller")]
pub fn hash(
    s: &str,
) -> impl Future<Output = Result<String, Box<dyn std::error::Error + Send + Sync>>>
{
    async move {
        let s = s.to_owned();
        let salt = SaltString::generate(&mut OsRng);
        tokio::task::spawn_blocking(move || {
            Argon2::default()
                .hash_password(s.as_bytes(), &salt)
                .map(|res| res.to_string())
        })
        .await
        .inspect_err(|e| {
            tracing::error!(location = %Location::caller(), error = %e);
        })?
        .map_err(|e| {
            tracing::error!(location = %Location::caller(), error = %e);
            Box::new(e).into()
        })
    }
}

#[track_caller]
#[expect(clippy::manual_async_fn, reason = "track_caller")]
pub fn verify(
    secret_hash: String,
    bytes: Vec<u8>,
) -> impl Future<Output = Result<bool, Box<dyn std::error::Error + Send + Sync>>>
{
    async {
        let verify_result = tokio::task::spawn_blocking(move || {
            let hash = PasswordHash::new(&secret_hash)?;
            Argon2::default().verify_password(&bytes, &hash)
        })
        .await
        .inspect_err(|e| {
            tracing::error!(location = %Location::caller(), error = %e);
        })?;

        match verify_result {
            Ok(()) => Ok(true),
            Err(argon2::password_hash::Error::Password) => Ok(false),
            Err(other) => {
                tracing::error!(location = %Location::caller(), error = %other);
                Err(Box::new(other).into())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn hash_and_verify_correct_password_returns_true() {
        let password = "CorrectPassword1!";
        let hashed = hash(password).await.unwrap();
        let result =
            verify(hashed, password.as_bytes().to_vec()).await.unwrap();
        assert!(result, "verify should return true for the correct password");
    }

    #[tokio::test]
    async fn hash_and_verify_wrong_password_returns_false() {
        let password = "CorrectPassword1!";
        let hashed = hash(password).await.unwrap();
        let result = verify(hashed, "WrongPassword1!".as_bytes().to_vec())
            .await
            .unwrap();
        assert!(
            !result,
            "verify should return false for an incorrect password"
        );
    }

    #[tokio::test]
    async fn verify_with_invalid_hash_returns_error_not_false() {
        let result = verify(
            "this-is-not-a-valid-argon2-hash".to_owned(),
            "anypassword".as_bytes().to_vec(),
        )
        .await;
        assert!(
            result.is_err(),
            "verify should propagate a parse error instead of returning false"
        );
    }
}
