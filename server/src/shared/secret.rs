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
    use super::{hash, verify};

    #[tokio::test]
    async fn verify_returns_true_if_matches() {
        let plaintext = "Password123123!";
        let hashed = hash(plaintext).await.unwrap();

        let is_valid =
            verify(hashed, plaintext.as_bytes().to_vec()).await.unwrap();

        assert!(is_valid);
    }

    #[tokio::test]
    async fn verify_returns_false_for_non_matching_secret() {
        let hashed = hash("Password123123!").await.unwrap();

        let is_valid =
            verify(hashed, b"wrong-password".to_vec()).await.unwrap();

        assert!(!is_valid);
    }

    #[tokio::test]
    async fn verify_returns_error_for_invalid_hash() {
        let result =
            verify("invalid-hash".to_string(), b"Password123123!".to_vec())
                .await;

        assert!(result.is_err());
    }
}
