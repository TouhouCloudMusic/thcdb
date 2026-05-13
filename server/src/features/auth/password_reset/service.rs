use std::panic::Location;

use apalis::prelude::Storage;
use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use fred::prelude::{KeysInterface, LuaInterface};
use lettre::message::Mailbox;
use rand::Rng;
use serde::{Deserialize, Serialize};

use super::error::{
    ForgotPasswordError, ResetPasswordError, VerifyResetCodeError,
};
use super::verification::{
    SendPasswordResetEmailError, build_password_reset_email_message,
};
use crate::domain::auth::validate_password;
use crate::domain::model::VerificationCode;
use crate::domain::user::User;
use crate::features::auth::{Email, InvalidEmail, Service, repo};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, InvalidInput, MessageError};
use crate::shared::secret;

const PASSWORD_RESET_CODE_MAX_FAILED_ATTEMPTS: i32 = 10;
pub(super) const PASSWORD_RESET_CODE_EXPIRES_MINUTES: i64 = 10;
const PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS: i64 = 60;
const PASSWORD_RESET_KEY_RANDOM_BYTES_LEN: usize = 24;
const PASSWORD_RESET_KEY_MAX_LEN: usize = 64;
const PASSWORD_RESET_KEY_EXPIRES_MINUTES: i64 = 5;
pub(crate) const PASSWORD_RESET_EMAIL_KEY: &str = "auth:password-reset:email";

#[derive(Clone, Debug, Serialize, Deserialize)]
enum PasswordResetState {
    AwaitingCode {
        code_hash: String,
        code_expires_at: DateTime<FixedOffset>,
        code_sent_at: DateTime<FixedOffset>,
        failed_attempts: i32,
    },
    AwaitingPassword {
        reset_key_hash: String,
        reset_key_expires_at: DateTime<FixedOffset>,
    },
}

impl PasswordResetState {
    fn awaiting_code(
        code_hash: String,
        code_sent_at: DateTime<FixedOffset>,
    ) -> Self {
        Self::AwaitingCode {
            code_hash,
            code_expires_at: code_sent_at
                + Duration::minutes(PASSWORD_RESET_CODE_EXPIRES_MINUTES),
            code_sent_at,
            failed_attempts: 0,
        }
    }

    fn is_in_code_resend_cooldown(&self, now: DateTime<FixedOffset>) -> bool {
        let Self::AwaitingCode { code_sent_at, .. } = self else {
            return false;
        };

        now - *code_sent_at
            < Duration::seconds(PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS)
    }

    /// Returns the stored reset-code hash only while the state is still
    /// awaiting code verification, the code has not expired, and the caller
    /// has not exceeded the failed-attempt limit.
    fn verifiable_code_hash(&self, now: DateTime<FixedOffset>) -> Option<&str> {
        let Self::AwaitingCode {
            code_hash,
            code_expires_at,
            failed_attempts,
            ..
        } = self
        else {
            return None;
        };

        if *failed_attempts >= PASSWORD_RESET_CODE_MAX_FAILED_ATTEMPTS {
            return None;
        }

        (now <= *code_expires_at).then_some(code_hash.as_str())
    }

    const fn increment_failed_attempts(mut self) -> Self {
        if let Self::AwaitingCode {
            failed_attempts, ..
        } = &mut self
        {
            *failed_attempts += 1;
        }

        self
    }

    fn index_key(&self) -> Option<String> {
        match self {
            Self::AwaitingCode { .. } => None,
            Self::AwaitingPassword { reset_key_hash, .. } => {
                Some(password_reset_key_index_key(reset_key_hash))
            }
        }
    }

    fn ttl_seconds(&self, now: DateTime<FixedOffset>) -> Option<i64> {
        let expires_at = match self {
            Self::AwaitingCode {
                code_expires_at, ..
            } => code_expires_at,
            Self::AwaitingPassword {
                reset_key_expires_at,
                ..
            } => reset_key_expires_at,
        };
        let ttl_seconds = (*expires_at - now).num_seconds();

        (ttl_seconds > 0).then_some(ttl_seconds)
    }
}

fn generate_password_reset_token(random_bytes_len: usize) -> String {
    let mut rng = rand::rng();
    let mut bytes = vec![0_u8; random_bytes_len];
    rng.fill(bytes.as_mut_slice());
    BASE64_URL_SAFE_NO_PAD.encode(bytes)
}

fn hash_password_reset_key(reset_key: &str) -> String {
    BASE64_URL_SAFE_NO_PAD.encode(blake3::hash(reset_key.as_bytes()).as_bytes())
}

fn password_reset_state_key(user_id: i32) -> String {
    format!("auth:password-reset:user:{user_id}")
}

fn password_reset_key_index_key(reset_key_hash: &str) -> String {
    format!("auth:password-reset:key:{reset_key_hash}")
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize)]
struct ConsumedPasswordResetKey {
    user_id: i32,
    reset_key_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub(crate) struct PasswordResetEmailJob {
    pub user_id: i32,
    pub email: String,
    pub code: String,
    pub code_hash: String,
    pub code_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Debug)]
pub(super) struct ForgotPasswordCommand {
    pub email: String,
}

#[derive(Clone, Debug)]
pub(super) struct ForgotPasswordResult {
    pub verification_code_expires_minutes: i64,
    pub resend_cooldown_seconds: i64,
}

impl Default for ForgotPasswordResult {
    fn default() -> Self {
        Self {
            verification_code_expires_minutes:
                PASSWORD_RESET_CODE_EXPIRES_MINUTES,
            resend_cooldown_seconds:
                PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS,
        }
    }
}

#[derive(Clone, Debug)]
pub(super) struct VerifyResetCodeCommand {
    pub email: String,
    pub code: String,
}

#[derive(Clone, Debug)]
pub(super) struct VerifiedResetPasswordSession {
    pub key: String,
    pub key_expires_minutes: i64,
    pub key_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Debug)]
pub(super) struct ResetPasswordCommand {
    pub key: String,
    pub password: String,
}

impl ConsumedPasswordResetKey {
    fn parse_payload(payload: &str) -> Result<Option<Self>, InternalError> {
        if payload.is_empty() {
            return Ok(None);
        }

        serde_json::from_str(payload)
            .map(Some)
            .map_err(InternalError::new)
    }
}

#[derive(Clone, Debug)]
struct StoredPasswordResetState {
    payload: String,
    state: PasswordResetState,
}

impl StoredPasswordResetState {
    fn from_state(state: PasswordResetState) -> Result<Self, InternalError> {
        Ok(Self {
            payload: serde_json::to_string(&state)
                .map_err(InternalError::new)?,
            state,
        })
    }
}

impl Service {
    pub(super) async fn forgot_password(
        &self,
        ForgotPasswordCommand { email }: ForgotPasswordCommand,
    ) -> Result<ForgotPasswordResult, ForgotPasswordError> {
        let email = Email::parse(&email)
            .map_err(|source| ForgotPasswordError::InvalidEmail { source })?;

        // Keep roughly the same Argon2 work on the "unknown email" and
        // "still cooling down" paths so this endpoint leaks less timing signal.
        let code = VerificationCode::<6>::new();
        let code_hash = secret::hash(&code.to_string())
            .await
            .map_err(InternalError)?;

        let Some(user) = self.find_verified_user_by_email(&email).await? else {
            return Ok(ForgotPasswordResult::default());
        };

        let existing_state =
            self.load_stored_password_reset_state(user.id).await?;
        let now: DateTime<FixedOffset> = Utc::now().into();

        if let Some(state) = existing_state.as_ref()
            && state.state.is_in_code_resend_cooldown(now)
        {
            return Ok(ForgotPasswordResult::default());
        }

        let next_state = StoredPasswordResetState::from_state(
            PasswordResetState::awaiting_code(code_hash.clone(), now),
        )?;
        let saved = self
            .save_password_reset_state_if_unmodified(
                user.id,
                existing_state.as_ref(),
                &next_state.state,
            )
            .await?;
        if !saved {
            return Ok(ForgotPasswordResult::default());
        }

        let queued = self
            .enqueue_password_reset_email(PasswordResetEmailJob {
                user_id: user.id,
                email: user.email.clone(),
                code: code.to_string(),
                code_hash,
                code_expires_at: now
                    + Duration::minutes(PASSWORD_RESET_CODE_EXPIRES_MINUTES),
            })
            .await;
        if let Err(err) = queued {
            log::warn!(
                target: "features.auth.password_reset.service",
                user_id = user.id,
                error:? = err;
                "failed to enqueue password reset email"
            );
            match self
                .rollback_password_reset_state(
                    user.id,
                    &next_state,
                    existing_state.as_ref(),
                )
                .await
            {
                Ok(true) => {}
                Ok(false) => {
                    log::warn!(
                        target: "features.auth.password_reset.service",
                        user_id = user.id;
                        "skipped rolling back password reset state after queue failure because a newer state already exists"
                    );
                }
                Err(cleanup_err) => {
                    log::error!(
                        target: "features.auth.password_reset.service",
                        user_id = user.id,
                        error:? = cleanup_err;
                        "failed to roll back password reset state after queue failure"
                    );
                }
            }
            return Err(err.into());
        }

        Ok(ForgotPasswordResult::default())
    }

    pub(super) async fn verify_reset_code(
        &self,
        VerifyResetCodeCommand { email, code }: VerifyResetCodeCommand,
    ) -> Result<VerifiedResetPasswordSession, VerifyResetCodeError> {
        let email = Email::parse(&email)
            .map_err(|source| VerifyResetCodeError::InvalidEmail { source })?;

        let user = self
            .find_verified_user_by_email(&email)
            .await?
            .ok_or(VerifyResetCodeError::InvalidOrExpiredResetCode)?;

        let Some(submitted_code) = VerificationCode::<6>::parse(code.as_str())
        else {
            return Err(VerifyResetCodeError::InvalidOrExpiredResetCode);
        };

        loop {
            let state =
                self.load_stored_password_reset_state(user.id)
                    .await?
                    .ok_or(VerifyResetCodeError::InvalidOrExpiredResetCode)?;

            let now: DateTime<FixedOffset> = Utc::now().into();
            let code_hash = state
                .state
                .verifiable_code_hash(now)
                .ok_or(VerifyResetCodeError::InvalidOrExpiredResetCode)?
                .to_owned();

            let is_valid = secret::verify(
                code_hash,
                submitted_code.as_ascii_bytes().to_vec(),
            )
            .await
            .map_err(InternalError)?;
            if !is_valid {
                let incremented = self
                    .increment_password_reset_failed_attempts_if_unmodified(
                        user.id, &state,
                    )
                    .await?;
                if incremented {
                    return Err(
                        VerifyResetCodeError::InvalidOrExpiredResetCode,
                    );
                }

                continue;
            }

            let reset_key = generate_password_reset_token(
                PASSWORD_RESET_KEY_RANDOM_BYTES_LEN,
            );
            let reset_key_expires_at = (Utc::now()
                + Duration::minutes(PASSWORD_RESET_KEY_EXPIRES_MINUTES))
            .into();
            let next_state = PasswordResetState::AwaitingPassword {
                reset_key_hash: hash_password_reset_key(&reset_key),
                reset_key_expires_at,
            };
            let saved = self
                .save_password_reset_state_if_unmodified(
                    user.id,
                    Some(&state),
                    &next_state,
                )
                .await?;
            if saved {
                return Ok(VerifiedResetPasswordSession {
                    key: reset_key,
                    key_expires_minutes: PASSWORD_RESET_KEY_EXPIRES_MINUTES,
                    key_expires_at: reset_key_expires_at,
                });
            }
        }
    }

    pub(super) async fn reset_password(
        &self,
        ResetPasswordCommand {
            key: reset_key,
            password,
        }: ResetPasswordCommand,
    ) -> Result<(), ResetPasswordError> {
        if reset_key.len() > PASSWORD_RESET_KEY_MAX_LEN {
            return Err(ResetPasswordError::InvalidOrExpiredResetKey);
        }

        validate_password(&password)?;
        let password_hash =
            secret::hash(&password).await.map_err(InternalError)?;

        let reset_key_hash = hash_password_reset_key(&reset_key);
        let consumed = self
            .consume_password_reset_key(&reset_key_hash)
            .await?
            .ok_or(ResetPasswordError::InvalidOrExpiredResetKey)?;
        let consumed_user_id = consumed.user_id;

        let user = match self.find_verified_user_by_id(consumed.user_id).await {
            Ok(Some(user)) => user,
            Ok(None) => {
                return Err(ResetPasswordError::InvalidOrExpiredResetKey);
            }
            Err(err) => {
                if let Err(restore_err) = self
                    .restore_consumed_password_reset_key(
                        consumed,
                        &reset_key_hash,
                    )
                    .await
                {
                    log::error!(
                        target: "features.auth.password_reset.service",
                        user_id = consumed_user_id,
                        error:? = restore_err;
                        "failed to restore consumed password reset key after user lookup failure"
                    );
                }
                return Err(err.into());
            }
        };

        if let Err(err) =
            repo::set_password(&self.repo.conn, user.id, password_hash).await
        {
            if let Err(restore_err) = self
                .restore_consumed_password_reset_key(consumed, &reset_key_hash)
                .await
            {
                log::error!(
                    target: "features.auth.password_reset.service",
                    user_id = consumed_user_id,
                    error:? = restore_err;
                    "failed to restore consumed password reset key after password update failure"
                );
            }
            return Err(err.into());
        }

        Ok(())
    }

    async fn find_verified_user_by_email(
        &self,
        email: &Email,
    ) -> Result<Option<User>, DatabaseError> {
        Ok(repo::find_by_email(&self.repo.conn, email)
            .await?
            .filter(|user| user.email_verified))
    }

    async fn enqueue_password_reset_email(
        &self,
        job: PasswordResetEmailJob,
    ) -> Result<(), InternalError> {
        let user_id = job.user_id;
        let mut queue = self.password_reset_email_queue.clone();
        queue.push(job).await.map_err(|err| {
            log::error!(
                target: "features.auth.password_reset.service",
                user_id = user_id,
                error:? = err;
                "failed to enqueue password reset email job"
            );
            InternalError::new(err)
        })?;

        Ok(())
    }

    async fn find_verified_user_by_id(
        &self,
        user_id: i32,
    ) -> Result<Option<User>, DatabaseError> {
        Ok(repo::find_by_id(&self.repo.conn, user_id)
            .await?
            .filter(|user| user.email_verified))
    }

    async fn load_password_reset_state(
        &self,
        user_id: i32,
    ) -> Result<Option<PasswordResetState>, InternalError> {
        self.load_stored_password_reset_state(user_id)
            .await
            .map(|state| state.map(|state| state.state))
    }

    async fn load_stored_password_reset_state(
        &self,
        user_id: i32,
    ) -> Result<Option<StoredPasswordResetState>, InternalError> {
        let payload = self
            .redis_pool
            .get::<Option<String>, _>(password_reset_state_key(user_id))
            .await
            .map_err(InternalError::new)?;

        payload
            .map(|payload| {
                serde_json::from_str(&payload)
                    .map(|state| StoredPasswordResetState { payload, state })
                    .map_err(|err| {
                        log::error!(
                            target: "features.auth.password_reset.service",
                            location:% = Location::caller(),
                            user_id = user_id,
                            error:? = err;
                            "failed to deserialize password reset state"
                        );
                        InternalError::new(err)
                    })
            })
            .transpose()
    }

    async fn consume_password_reset_key(
        &self,
        reset_key_hash: &str,
    ) -> Result<Option<ConsumedPasswordResetKey>, InternalError> {
        let payload: String = self
            .redis_pool
            .eval(
                include_str!("consume_password_reset_key.lua"),
                vec![password_reset_key_index_key(reset_key_hash)],
                vec!["auth:password-reset:user", reset_key_hash],
            )
            .await
            .map_err(|err| {
                log::error!(
                    target: "features.auth.password_reset.service",
                    error:? = err;
                    "failed to atomically consume password reset key"
                );
                InternalError::new(err)
            })?;

        ConsumedPasswordResetKey::parse_payload(&payload).map_err(|err| {
            log::error!(
                target: "features.auth.password_reset.service",
                location:% = Location::caller(),
                error:? = err;
                "failed to parse consumed password reset key payload"
            );
            err
        })
    }

    async fn restore_consumed_password_reset_key(
        &self,
        consumed: ConsumedPasswordResetKey,
        reset_key_hash: &str,
    ) -> Result<(), InternalError> {
        let now: DateTime<FixedOffset> = Utc::now().into();
        if consumed.reset_key_expires_at <= now {
            return Ok(());
        }

        let state = PasswordResetState::AwaitingPassword {
            reset_key_hash: reset_key_hash.to_string(),
            reset_key_expires_at: consumed.reset_key_expires_at,
        };
        if self
            .save_password_reset_state_if_unmodified(
                consumed.user_id,
                None,
                &state,
            )
            .await?
        {
            return Ok(());
        }

        log::warn!(
            target: "features.auth.password_reset.service",
            user_id = consumed.user_id;
            "skipped restoring consumed password reset key because a newer state already exists"
        );
        Ok(())
    }

    async fn rollback_password_reset_state(
        &self,
        user_id: i32,
        current_state: &StoredPasswordResetState,
        previous_state: Option<&StoredPasswordResetState>,
    ) -> Result<bool, InternalError> {
        match previous_state {
            Some(previous_state) => {
                self.save_password_reset_state_if_unmodified(
                    user_id,
                    Some(current_state),
                    &previous_state.state,
                )
                .await
            }
            None => {
                self.clear_password_reset_state_if_unmodified(
                    user_id,
                    current_state,
                )
                .await
            }
        }
    }

    async fn increment_password_reset_failed_attempts_if_unmodified(
        &self,
        user_id: i32,
        expected_state: &StoredPasswordResetState,
    ) -> Result<bool, InternalError> {
        let saved: i64 = self
            .redis_pool
            .eval(
                include_str!("increment_failed_attempts_if_matches.lua"),
                vec![password_reset_state_key(user_id)],
                vec![expected_state.payload.clone()],
            )
            .await
            .map_err(|err| {
                log::error!(
                    target: "features.auth.password_reset.service",
                    user_id = user_id,
                    error:? = err;
                    "failed to atomically increment password reset failed attempts"
                );
                InternalError::new(err)
            })?;

        Ok(saved == 1)
    }

    async fn save_password_reset_state(
        &self,
        user_id: i32,
        state: &PasswordResetState,
    ) -> Result<(), InternalError> {
        let previous_state =
            self.load_stored_password_reset_state(user_id).await?;
        let saved = self
            .save_password_reset_state_if_unmodified(
                user_id,
                previous_state.as_ref(),
                state,
            )
            .await?;
        if !saved {
            return Err(InternalError::new(MessageError::new(
                "Password reset state changed while saving",
            )));
        }

        Ok(())
    }

    async fn save_password_reset_state_if_unmodified(
        &self,
        user_id: i32,
        previous_state: Option<&StoredPasswordResetState>,
        next_state: &PasswordResetState,
    ) -> Result<bool, InternalError> {
        let Some(ttl_seconds) = next_state.ttl_seconds(Utc::now().into())
        else {
            return Ok(false);
        };
        let payload =
            serde_json::to_string(next_state).map_err(InternalError::new)?;
        let current_index_key = next_state.index_key().unwrap_or_default();
        let previous_index_key = previous_state
            .and_then(|state| state.state.index_key())
            .unwrap_or_default();

        let saved: i64 = self
            .redis_pool
            .eval(
                include_str!("save_password_reset_state_if_matches.lua"),
                vec![password_reset_state_key(user_id)],
                vec![
                    if previous_state.is_some() { "1" } else { "0" }
                        .to_string(),
                    previous_state
                        .map(|state| state.payload.clone())
                        .unwrap_or_default(),
                    payload,
                    ttl_seconds.to_string(),
                    current_index_key,
                    previous_index_key,
                    user_id.to_string(),
                ],
            )
            .await
            .map_err(|err| {
                log::error!(
                    target: "features.auth.password_reset.service",
                    user_id = user_id,
                    error:? = err;
                    "failed to compare-and-swap password reset state"
                );
                InternalError::new(err)
            })?;

        Ok(saved == 1)
    }

    async fn clear_password_reset_state_if_unmodified(
        &self,
        user_id: i32,
        expected_state: &StoredPasswordResetState,
    ) -> Result<bool, InternalError> {
        let index_key = expected_state.state.index_key().unwrap_or_default();
        let cleared: i64 = self
            .redis_pool
            .eval(
                include_str!("clear_password_reset_state_if_matches.lua"),
                vec![password_reset_state_key(user_id)],
                vec![expected_state.payload.clone(), index_key],
            )
            .await
            .map_err(|err| {
                log::error!(
                    target: "features.auth.password_reset.service",
                    user_id = user_id,
                    error:? = err;
                    "failed to compare-and-clear password reset state"
                );
                InternalError::new(err)
            })?;

        Ok(cleared == 1)
    }

    async fn send_password_reset_email(
        &self,
        to: &str,
        code: &VerificationCode<6>,
    ) -> Result<(), SendPasswordResetEmailError> {
        let from = self.mailer.from().clone();
        let to: Mailbox = match to.parse() {
            Ok(v) => v,
            Err(err) => {
                log::error!(
                    target: "features.auth.password_reset.service",
                    error:% = err;
                    "invalid password reset recipient address"
                );
                return Err(SendPasswordResetEmailError::InvalidEmail(
                    InvalidEmail::new(
                        to,
                        InvalidInput::new(
                            &"Invalid password reset recipient address",
                        ),
                    ),
                ));
            }
        };

        let message = build_password_reset_email_message(from, to, *code)?;

        match self.mailer.send(message).await {
            Ok(()) => Ok(()),
            Err(err) => {
                log::error!(
                    target: "features.auth.password_reset.service",
                    error:% = err;
                    "failed to send password reset email"
                );
                Err(SendPasswordResetEmailError::Unavailable)
            }
        }
    }
}

pub(crate) async fn password_reset_email_job_is_current(
    redis_pool: &fred::prelude::Pool,
    job: &PasswordResetEmailJob,
) -> bool {
    let payload = match redis_pool
        .get::<Option<String>, _>(password_reset_state_key(job.user_id))
        .await
    {
        Ok(payload) => payload,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.service",
                user_id = job.user_id,
                error:? = err;
                "failed to load password reset state while processing email job"
            );
            return false;
        }
    };

    let Some(payload) = payload else {
        return false;
    };

    let state = match serde_json::from_str::<PasswordResetState>(&payload) {
        Ok(state) => state,
        Err(err) => {
            log::error!(
                target: "features.auth.password_reset.service",
                user_id = job.user_id,
                error:? = err;
                "failed to deserialize password reset state while processing email job"
            );
            return false;
        }
    };

    let PasswordResetState::AwaitingCode {
        code_hash,
        code_expires_at,
        ..
    } = state
    else {
        return false;
    };

    code_hash == job.code_hash && code_expires_at == job.code_expires_at && {
        let now: DateTime<FixedOffset> = Utc::now().into();
        now <= code_expires_at
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[test]
    fn parse_consumed_password_reset_key_payload_accepts_valid_value() {
        let reset_key_expires_at: DateTime<FixedOffset> =
            "2026-03-07T10:11:12+00:00".parse().unwrap();

        assert_eq!(
            ConsumedPasswordResetKey::parse_payload(
                r#"{"user_id":42,"reset_key_expires_at":"2026-03-07T10:11:12+00:00"}"#,
            )
            .unwrap(),
            Some(ConsumedPasswordResetKey {
                user_id: 42,
                reset_key_expires_at,
            })
        );
    }

    #[test]
    fn parse_consumed_password_reset_key_payload_returns_none_for_empty() {
        assert_eq!(ConsumedPasswordResetKey::parse_payload("").unwrap(), None);
    }

    #[test]
    fn parse_consumed_password_reset_key_payload_rejects_invalid_value() {
        assert!(ConsumedPasswordResetKey::parse_payload("42").is_err());
        assert!(
            ConsumedPasswordResetKey::parse_payload(
                r#"{"user_id":"x","reset_key_expires_at":"2026-03-07T10:11:12+00:00"}"#,
            )
            .is_err()
        );
        assert!(
            ConsumedPasswordResetKey::parse_payload(
                r#"{"user_id":42,"reset_key_expires_at":"x"}"#,
            )
            .is_err()
        );
    }
}

// TODO : Refactor env
#[cfg(all(test, feature = "integration-test"))]
mod tests {
    use std::sync::Arc;

    use lettre::{AsyncSmtpTransport, Tokio1Executor};
    use sea_orm::TransactionTrait;
    use tokio::sync::Barrier;

    use super::*;
    use crate::domain::user::NewUser;
    use crate::infra::database::sea_orm::SeaOrmRepository;
    use crate::infra::email::Mailer;
    use crate::infra::integration_test::{test_connection, test_redis_url};
    use crate::infra::redis::Pool as RedisPool;

    fn build_failing_mailer() -> Mailer {
        let transport =
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(
                "127.0.0.1",
            )
            .port(1)
            .build();
        let from: Mailbox = "admin@example.com".parse().unwrap();
        Mailer::new(transport, from)
    }

    async fn create_verified_user(
        conn: &sea_orm::DatabaseConnection,
    ) -> crate::domain::user::User {
        let suffix = Utc::now().timestamp_nanos_opt().unwrap_or_default();
        let name = format!("alice_{suffix}");
        let email = format!("alice_{suffix}@example.com");

        let tx = conn.begin().await.unwrap();
        let user = repo::create_user(
            &tx,
            NewUser {
                name,
                email,
                email_verified: true,
                password: "password_hash".to_string(),
            },
        )
        .await
        .unwrap();
        tx.commit().await.unwrap();
        user
    }

    async fn build_test_service(conn: &sea_orm::DatabaseConnection) -> Service {
        let repo = SeaOrmRepository::new(conn.clone());
        let redis_url = test_redis_url();
        let redis_pool = RedisPool::init(&redis_url).await.inner;
        let queue =
            crate::infra::worker::password_reset_email_queue(&redis_url)
                .await
                .unwrap();
        Service::new(repo, build_failing_mailer(), redis_pool, queue)
    }

    #[tokio::test]
    async fn forgot_password_does_not_leak_email_service_failures() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;

        let existing = service
            .forgot_password(ForgotPasswordCommand {
                email: user.email.clone(),
            })
            .await
            .unwrap();
        let missing = service
            .forgot_password(ForgotPasswordCommand {
                email: "missing@example.com".to_string(),
            })
            .await
            .unwrap();

        assert_eq!(
            existing.verification_code_expires_minutes,
            missing.verification_code_expires_minutes
        );
        assert_eq!(
            existing.resend_cooldown_seconds,
            missing.resend_cooldown_seconds
        );
    }

    #[tokio::test]
    async fn verify_reset_code_too_many_attempts_is_indistinguishable() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;

        let now: DateTime<FixedOffset> = Utc::now().into();
        let state = PasswordResetState::awaiting_code("hash".to_string(), now);
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        for _ in 0..PASSWORD_RESET_CODE_MAX_FAILED_ATTEMPTS {
            let mut state = service
                .load_password_reset_state(user.id)
                .await
                .unwrap()
                .unwrap();
            if let PasswordResetState::AwaitingCode {
                failed_attempts, ..
            } = &mut state
            {
                *failed_attempts += 1;
            }
            service
                .save_password_reset_state(user.id, &state)
                .await
                .unwrap();
        }

        let err = service
            .verify_reset_code(VerifyResetCodeCommand {
                email: user.email.clone(),
                code: "000000".to_string(),
            })
            .await
            .unwrap_err();

        assert!(
            matches!(err, VerifyResetCodeError::InvalidOrExpiredResetCode),
            "unexpected error: {err:?}"
        );
    }

    #[tokio::test]
    async fn verify_reset_code_returns_at_most_one_key_when_racing() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;
        let code = "123456".to_string();
        let state = PasswordResetState::awaiting_code(
            crate::shared::secret::hash(&code).await.unwrap(),
            Utc::now().into(),
        );
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        let barrier = Arc::new(Barrier::new(3));

        let first_service = service.clone();
        let first_barrier = barrier.clone();
        let first_email = user.email.clone();
        let first_code = code.clone();
        let first = async move {
            first_barrier.wait().await;
            first_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: first_email,
                    code: first_code,
                })
                .await
        };

        let second_service = service.clone();
        let second_barrier = barrier.clone();
        let second_email = user.email.clone();
        let second = async move {
            second_barrier.wait().await;
            second_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: second_email,
                    code,
                })
                .await
        };

        let (first_result, second_result, _) =
            tokio::join!(first, second, barrier.wait());
        let success_count = [first_result.as_ref(), second_result.as_ref()]
            .into_iter()
            .flatten()
            .count();

        assert_eq!(success_count, 1);
        assert!(
            first_result.is_ok()
                || matches!(
                    first_result,
                    Err(VerifyResetCodeError::InvalidOrExpiredResetCode)
                )
        );
        assert!(
            second_result.is_ok()
                || matches!(
                    second_result,
                    Err(VerifyResetCodeError::InvalidOrExpiredResetCode)
                )
        );
        assert!(
            service
                .load_password_reset_state(user.id)
                .await
                .unwrap()
                .is_some()
        );
    }

    #[tokio::test]
    async fn verify_reset_code_counts_each_invalid_attempt_when_racing() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;
        let state = PasswordResetState::awaiting_code(
            crate::shared::secret::hash("123456").await.unwrap(),
            Utc::now().into(),
        );
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        let barrier = Arc::new(Barrier::new(5));

        let first_service = service.clone();
        let first_barrier = barrier.clone();
        let first_email = user.email.clone();
        let first = async move {
            first_barrier.wait().await;
            first_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: first_email,
                    code: "000000".to_string(),
                })
                .await
        };

        let second_service = service.clone();
        let second_barrier = barrier.clone();
        let second_email = user.email.clone();
        let second = async move {
            second_barrier.wait().await;
            second_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: second_email,
                    code: "000000".to_string(),
                })
                .await
        };

        let third_service = service.clone();
        let third_barrier = barrier.clone();
        let third_email = user.email.clone();
        let third = async move {
            third_barrier.wait().await;
            third_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: third_email,
                    code: "000000".to_string(),
                })
                .await
        };

        let fourth_service = service.clone();
        let fourth_barrier = barrier.clone();
        let fourth_email = user.email.clone();
        let fourth = async move {
            fourth_barrier.wait().await;
            fourth_service
                .verify_reset_code(VerifyResetCodeCommand {
                    email: fourth_email,
                    code: "000000".to_string(),
                })
                .await
        };

        let (first_result, second_result, third_result, fourth_result, _) =
            tokio::join!(first, second, third, fourth, barrier.wait());

        for result in [first_result, second_result, third_result, fourth_result]
        {
            assert!(matches!(
                result,
                Err(VerifyResetCodeError::InvalidOrExpiredResetCode)
            ));
        }

        let state = service
            .load_password_reset_state(user.id)
            .await
            .unwrap()
            .unwrap();
        let PasswordResetState::AwaitingCode {
            failed_attempts, ..
        } = state
        else {
            panic!("expected AwaitingCode state");
        };
        assert_eq!(failed_attempts, 4);
    }

    #[tokio::test]
    async fn reset_password_invalid_key_format_is_rejected() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let err = service
            .reset_password(ResetPasswordCommand {
                key: "invalid".to_string(),
                password: "m10KSGDckKrX38Vm".to_string(),
            })
            .await
            .unwrap_err();
        assert!(
            matches!(err, ResetPasswordError::InvalidOrExpiredResetKey),
            "unexpected error: {err:?}"
        );
    }

    #[tokio::test]
    async fn reset_password_unknown_key_does_not_clear_existing_state() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;
        let valid_key =
            generate_password_reset_token(PASSWORD_RESET_KEY_RANDOM_BYTES_LEN);

        let state = PasswordResetState::AwaitingPassword {
            reset_key_hash: hash_password_reset_key(&valid_key),
            reset_key_expires_at: (Utc::now()
                + Duration::minutes(PASSWORD_RESET_KEY_EXPIRES_MINUTES))
            .into(),
        };
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        let err = service
            .reset_password(ResetPasswordCommand {
                key: generate_password_reset_token(
                    PASSWORD_RESET_KEY_RANDOM_BYTES_LEN,
                ),
                password: "m10KSGDckKrX38Vm".to_string(),
            })
            .await
            .unwrap_err();
        assert!(
            matches!(err, ResetPasswordError::InvalidOrExpiredResetKey),
            "unexpected error: {err:?}"
        );

        let state = service
            .load_password_reset_state(user.id)
            .await
            .unwrap()
            .unwrap();
        assert!(matches!(state, PasswordResetState::AwaitingPassword { .. }));
    }

    #[tokio::test]
    async fn restore_consumed_password_reset_key_preserves_original_expiry() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;
        let reset_key =
            generate_password_reset_token(PASSWORD_RESET_KEY_RANDOM_BYTES_LEN);
        let reset_key_hash = hash_password_reset_key(&reset_key);
        let reset_key_expires_at = (Utc::now()
            + Duration::minutes(PASSWORD_RESET_KEY_EXPIRES_MINUTES))
        .into();

        let state = PasswordResetState::AwaitingPassword {
            reset_key_hash: reset_key_hash.clone(),
            reset_key_expires_at,
        };
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        let consumed = service
            .consume_password_reset_key(&reset_key_hash)
            .await
            .unwrap()
            .unwrap();
        assert_eq!(consumed.reset_key_expires_at, reset_key_expires_at);

        service
            .restore_consumed_password_reset_key(consumed, &reset_key_hash)
            .await
            .unwrap();

        let restored = service
            .load_password_reset_state(user.id)
            .await
            .unwrap()
            .unwrap();
        let PasswordResetState::AwaitingPassword {
            reset_key_expires_at: restored_expires_at,
            ..
        } = restored
        else {
            panic!("expected AwaitingPassword state");
        };
        assert_eq!(restored_expires_at, reset_key_expires_at);
    }

    #[tokio::test]
    async fn reset_password_consumes_same_key_atomically() {
        let conn = test_connection().await;
        let service = build_test_service(&conn).await;

        let user = create_verified_user(&conn).await;
        let reset_key =
            generate_password_reset_token(PASSWORD_RESET_KEY_RANDOM_BYTES_LEN);

        let state = PasswordResetState::AwaitingPassword {
            reset_key_hash: hash_password_reset_key(&reset_key),
            reset_key_expires_at: (Utc::now()
                + Duration::minutes(PASSWORD_RESET_KEY_EXPIRES_MINUTES))
            .into(),
        };
        service
            .save_password_reset_state(user.id, &state)
            .await
            .unwrap();

        let barrier = Arc::new(Barrier::new(3));
        let first_service = service.clone();
        let first_barrier = barrier.clone();
        let first_request = ResetPasswordCommand {
            key: reset_key.clone(),
            password: "m10KSGDckKrX38Vm".to_string(),
        };
        let first = tokio::spawn(async move {
            first_barrier.wait().await;
            first_service.reset_password(first_request).await
        });

        let second_service = service.clone();
        let second_barrier = barrier.clone();
        let second_request = ResetPasswordCommand {
            key: reset_key,
            password: "m10KSGDckKrX38Vm".to_string(),
        };
        let second = tokio::spawn(async move {
            second_barrier.wait().await;
            second_service.reset_password(second_request).await
        });

        barrier.wait().await;

        let first_result = first.await.unwrap();
        let second_result = second.await.unwrap();
        let success_count = [first_result.as_ref(), second_result.as_ref()]
            .into_iter()
            .flatten()
            .count();

        assert_eq!(success_count, 1);
        assert!(
            matches!(first_result, Ok(()))
                || matches!(
                    first_result,
                    Err(ResetPasswordError::InvalidOrExpiredResetKey)
                )
        );
        assert!(
            matches!(second_result, Ok(()))
                || matches!(
                    second_result,
                    Err(ResetPasswordError::InvalidOrExpiredResetKey)
                )
        );
        assert!(
            !matches!(first_result, Ok(())) || !matches!(second_result, Ok(()))
        );
        assert!(
            service
                .load_password_reset_state(user.id)
                .await
                .unwrap()
                .is_none()
        );
    }
}
