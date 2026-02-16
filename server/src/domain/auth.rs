use std::backtrace::Backtrace;
use std::borrow::Cow;
use std::sync::LazyLock;

use argon2::Argon2;
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{
    self, PasswordHash, PasswordHasher, PasswordVerifier, SaltString,
};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;
use macros::ApiError;
use regex::Regex;
use serde::{Deserialize, Serialize};
use snafu::Snafu;
use utoipa::ToSchema;

use crate::adapter::inbound::rest::api_response::{
    ApiError as ApiErrorTrait, Error, IntoApiResponse,
};
use crate::constant::{
    USER_NAME_REGEX_STR, USER_PASSWORD_MAX_LENGTH, USER_PASSWORD_MIN_LENGTH,
    USER_PASSWORD_REGEX_STR,
};
use crate::infra::singleton::ARGON2_HASHER;

pub const VERIFICATION_CODE_EXPIRES_MINUTES: i64 = 10;
pub const VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS: i64 = 60;
pub const SIGNUP_EXPIRES_HOURS: i64 = 24;

#[derive(Debug, Snafu)]
pub enum AuthnError {
    #[snafu(display("Incorrect username or password"))]
    AuthenticationFailed {
        location: &'static std::panic::Location<'static>,
    },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(display("Password hash error: {source}"))]
    PasswordHash {
        source: password_hash::Error,
        backtrace: Backtrace,
    },
    #[snafu(display("Join error: {source}"))]
    Join {
        source: tokio::task::JoinError,
        backtrace: Backtrace,
    },
}

impl AuthnError {
    pub(crate) fn status_code(&self) -> StatusCode {
        match self {
            AuthnError::AuthenticationFailed { .. } => StatusCode::UNAUTHORIZED,
            AuthnError::Infra { source } => source.as_status_code(),
            AuthnError::PasswordHash { .. } | AuthnError::Join { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
        }
    }

    #[track_caller]
    pub const fn authentication_failed() -> Self {
        Self::AuthenticationFailed {
            location: std::panic::Location::caller(),
        }
    }
}

impl IntoResponse for AuthnError {
    fn into_response(self) -> axum::response::Response {
        let status_code = self.status_code();
        Error::from_err_and_code(self, status_code).into_response()
    }
}

impl From<password_hash::Error> for AuthnError {
    fn from(source: password_hash::Error) -> Self {
        Self::PasswordHash {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

impl From<tokio::task::JoinError> for AuthnError {
    fn from(source: tokio::task::JoinError) -> Self {
        Self::Join {
            source,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, Snafu, ApiError)]
#[snafu(display("{kind}"))]
#[api_error(status_code = StatusCode::BAD_REQUEST)]
pub struct ValidateCredsError {
    pub kind: ValidateCredsErrorKind,
    pub backtrace: Backtrace,
}

impl From<ValidateCredsErrorKind> for ValidateCredsError {
    fn from(kind: ValidateCredsErrorKind) -> Self {
        Self {
            kind,
            backtrace: Backtrace::capture(),
        }
    }
}

#[derive(Debug, Display)]
pub enum ValidateCredsErrorKind {
    #[display("Invalid username")]
    InvalidUserName,
    #[display("Password must be at least 8 characters")]
    PasswordTooShort,
    #[display("Password must be at most 64 characters")]
    PasswordTooLong,
    #[display("Password contains invalid or whitespace characters")]
    PasswordInvalidCharacters,
    #[display("Password is too weak")]
    PasswordTooWeak,
}

use ValidateCredsErrorKind::*;

#[derive(Debug, Snafu, ApiError)]

pub enum HasherError {
    #[snafu(display("Failed to hash password: {source}"))]
    #[api_error(status_code = StatusCode::INTERNAL_SERVER_ERROR)]
    HashPasswordFailed {
        source: password_hash::Error,
        backtrace: Backtrace,
    },
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct SignUpRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Clone, Serialize, ToSchema)]
pub struct SignUpResponse {
    pub verification_code_expires_minutes: i64,
    pub resend_cooldown_seconds: i64,
    pub signup_expires_hours: i64,
}

impl Default for SignUpResponse {
    fn default() -> Self {
        Self {
            verification_code_expires_minutes:
                VERIFICATION_CODE_EXPIRES_MINUTES,
            resend_cooldown_seconds: VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS,
            signup_expires_hours: SIGNUP_EXPIRES_HOURS,
        }
    }
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct VerifyEmailRequest {
    pub email: String,
    pub code: String,
}

#[derive(Clone, Deserialize, ToSchema)]
pub struct ResendVerificationEmailRequest {
    pub email: String,
}

#[derive(Clone, Serialize, ToSchema)]
pub struct ResendVerificationEmailResponse {
    pub verification_code_expires_minutes: i64,
    pub resend_cooldown_seconds: i64,
}

impl Default for ResendVerificationEmailResponse {
    fn default() -> Self {
        Self {
            verification_code_expires_minutes:
                VERIFICATION_CODE_EXPIRES_MINUTES,
            resend_cooldown_seconds: VERIFICATION_CODE_RESEND_COOLDOWN_SECONDS,
        }
    }
}

#[expect(clippy::unsafe_derive_deserialize, reason = "skipped")]
#[derive(Clone, Deserialize, ToSchema)]
pub struct AuthCredential {
    pub username: String,
    pub password: String,
    #[serde(skip)]
    hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Display)]
#[display("{_0}")]
pub struct HashedPassword<'a>(Cow<'a, str>);

impl<'a> HashedPassword<'a> {
    pub fn as_str(&self) -> &str {
        self.0.as_ref()
    }
}

impl<'a> From<HashedPassword<'a>> for String {
    fn from(value: HashedPassword<'a>) -> Self {
        value.0.into_owned()
    }
}

impl AuthCredential {
    pub fn try_new(
        username: impl Into<String>,
        password: impl Into<String>,
    ) -> Result<Self, ValidateCredsError> {
        let username = username.into();
        let password = password.into();
        validate_username(&username)?;
        validate_password(&password)?;
        Ok(Self {
            username,
            password,
            hash: None,
        })
    }

    pub fn validate(&self) -> Result<(), ValidateCredsError> {
        validate_username(&self.username)?;
        validate_password(&self.password)?;

        Ok(())
    }

    pub fn password_hash(
        &mut self,
    ) -> Result<HashedPassword<'_>, password_hash::errors::Error> {
        if self.hash.is_none() {
            self.hash = Some(hash_password(&self.password)?);
        }

        let hash = self.hash.as_deref().expect("hash set above; qed");

        Ok(HashedPassword(Cow::Borrowed(hash)))
    }

    pub async fn verify_credentials(
        &self,
        hash: Option<&str>,
    ) -> Result<(), AuthnError> {
        let dummy_password = || hash_password("dummy_password");

        verify_password(
            hash.unwrap_or(&dummy_password()?).to_owned(),
            &self.password,
        )
        .await
    }
}

// TODO: convert error, password_hash::Error is badly designed
pub fn hash_password(pwd: &str) -> password_hash::Result<String> {
    let salt = SaltString::generate(&mut OsRng);

    let res = ARGON2_HASHER.hash_password(pwd.as_bytes(), &salt)?;

    Ok(res.to_string())
}

/// Return `[Err(AuthnError::AuthenticationFailed)]` if password is incorrect
/// otherwise return `Ok(())`
async fn verify_password(
    password_hash: String,
    input: &str,
) -> Result<(), AuthnError> {
    let bytes = input.as_bytes().to_owned();
    let verify_result = tokio::task::spawn_blocking(move || {
        let hash = PasswordHash::new(&password_hash)?;
        Argon2::default().verify_password(&bytes, &hash)
    })
    .await
    .map_err(AuthnError::from)?;

    match verify_result {
        Ok(()) => Ok(()),
        Err(password_hash::Error::Password) => {
            Err(AuthnError::authentication_failed())
        }
        Err(other) => Err(other.into()),
    }
}

fn validate_username(username: &str) -> Result<(), ValidateCredsError> {
    static USER_NAME_REGEX: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(USER_NAME_REGEX_STR).unwrap());

    if USER_NAME_REGEX.is_match(username)
        && !username
            .chars()
            .any(|c| c.is_control() || c.is_whitespace())
    {
        Ok(())
    } else {
        Err(InvalidUserName.into())
    }
}

/// Valid characters
/// - A-z
/// - 0-9
/// - `~!@#$%^&*()-_=+`
fn validate_password(password: &str) -> Result<(), ValidateCredsError> {
    use zxcvbn::{Score, zxcvbn};

    static USER_PASSWORD_REGEX: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(USER_PASSWORD_REGEX_STR).unwrap());

    let password_len = password.chars().count();
    if password_len < USER_PASSWORD_MIN_LENGTH as usize {
        return Err(PasswordTooShort.into());
    }
    if password_len > USER_PASSWORD_MAX_LENGTH as usize {
        return Err(PasswordTooLong.into());
    }
    if password
        .chars()
        .any(|c| c.is_control() || c.is_whitespace())
    {
        return Err(PasswordInvalidCharacters.into());
    }
    if !USER_PASSWORD_REGEX.is_match(password) {
        return Err(PasswordInvalidCharacters.into());
    }

    let result = zxcvbn(password, &[]);

    #[cfg(test)]
    {
        println!("password: {password}, score: {}", result.score());
    }

    match result.score() {
        Score::Three | Score::Four => Ok(()),
        _ => Err(PasswordTooWeak.into()),
    }
}

impl IntoApiResponse for HasherError {
    fn into_api_response(self) -> axum::response::Response {
        tracing::error!("Hasher error: {}", self);
        Error::from_api_error(&self).into_response()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[tokio::test]
    async fn verify_password() {
        let password = "Password123123!";
        let hash = hash_password(password).unwrap();

        let res = super::verify_password(hash, password).await.is_ok();

        assert!(res);
    }

    #[tokio::test]
    async fn verify_credentials() {
        let pwd = "Password123123!".to_string();
        let res = AuthCredential {
            username: "Alice".to_string(),
            password: pwd.clone(),
            hash: None,
        }
        .verify_credentials(Some(&hash_password(&pwd).unwrap()))
        .await
        .is_ok();

        assert!(res);
    }

    #[tokio::test]
    async fn verify_credentials_fail() {
        let pwd = "Password123123!".to_string();
        let res = AuthCredential {
            username: "Alice".to_string(),
            password: pwd.clone(),
            hash: None,
        }
        .verify_credentials(None)
        .await
        .is_err();

        assert!(res);
    }

    #[test]
    fn test_validate_username() {
        let test_cases = [
            ("", false),
            (" a ", false),
            ("a a", false),
            ("😀", false),
            (" ", false),
            ("\n", false),
            ("\t", false),
            ("\u{200B}", false),
            ("\u{00A0}", false),
            ("alice_megatron", true),
            ("无蛋黄", true),
            ("憂鬱的臺灣烏龜", true),
            ("ひらがな", true),
            ("かたかな", true),
            ("カタカナ", true),
            ("안녕하세요", true),
            ("사용자", true),
            ("пример", true),
            ("пользователь", true),
            ("müller", true),
            ("straße", true),
            ("مرحبا", true),
            ("مستخدم", true),
        ];

        for (username, expected) in test_cases {
            assert_eq!(validate_username(username).is_ok(), expected);
        }
    }

    #[test]
    fn test_validate_password() {
        let test_case = [
            ("Password123!", false),
            ("SecurePass#2023", true),
            ("HelloWorld!1", true),
            ("weak", false),
            ("password", false),
            ("PASSWORD123", false),
            ("Pass!", false),
            ("12345678", false),
            ("!@#$%^&*", false),
            ("NoSpecialChar123", true),
            ("NoNumberHere!", true),
            ("nocapitals1!", true),
            ("NOLOWERCASE1!", true),
            ("m10KSGDckKrX38Vm", true),
            ("1KrIuT%gcemHwjwF", true),
            ("a1`~!@#$%^&*()-_=+", true),
        ];

        for (password, expected) in test_case {
            assert_eq!(validate_password(password).is_ok(), expected);
        }
    }
}
