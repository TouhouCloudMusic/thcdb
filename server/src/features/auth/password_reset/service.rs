use std::panic::Location;

use auth_core::password_reset::{
    PASSWORD_RESET_CODE_EXPIRES_MINUTES,
    PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS, PasswordResetEmailJob,
    PasswordResetState, password_reset_key_index_key, password_reset_state_key,
};
use base64::Engine;
use base64::prelude::BASE64_URL_SAFE_NO_PAD;
use chrono::{DateTime, Duration, FixedOffset, Utc};
use fred::prelude::{KeysInterface, LuaInterface};
use infra_worker::Storage;
use rand::Rng;
use serde::Deserialize;

use super::error::{
    ForgotPasswordError, ResetPasswordError, VerifyResetCodeError,
};
use crate::features::auth::{
    Email, Service, VerificationCode, repo, validate_password,
};
use crate::features::user::User;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::secret;

const PASSWORD_RESET_KEY_RANDOM_BYTES_LEN: usize = 24;
const PASSWORD_RESET_KEY_MAX_LEN: usize = 64;
const PASSWORD_RESET_KEY_EXPIRES_MINUTES: i64 = 5;

fn generate_password_reset_token(random_bytes_len: usize) -> String {
    let mut rng = rand::rng();
    let mut bytes = vec![0_u8; random_bytes_len];
    rng.fill(bytes.as_mut_slice());
    BASE64_URL_SAFE_NO_PAD.encode(bytes)
}

fn hash_password_reset_key(reset_key: &str) -> String {
    BASE64_URL_SAFE_NO_PAD.encode(blake3::hash(reset_key.as_bytes()).as_bytes())
}

#[derive(Clone, Debug, Deserialize)]
struct ConsumedPasswordResetKey {
    user_id: i32,
    reset_key_expires_at: DateTime<FixedOffset>,
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
            payload: state.to_payload().map_err(InternalError::new)?,
            state,
        })
    }
}

impl Service {
    pub(super) async fn forgot_password(
        &self,
        ForgotPasswordCommand { email }: ForgotPasswordCommand,
    ) -> Result<ForgotPasswordResult, ForgotPasswordError> {
        let email = Email::parse(&email).map_err(ForgotPasswordError::from)?;

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
                email,
                code,
                code_hash,
                code_expires_at: now
                    + Duration::minutes(PASSWORD_RESET_CODE_EXPIRES_MINUTES),
            })
            .await;

        if let Err(err) = queued {
            log::warn!(
                target: "features.auth.password_reset.service",
                user_id = user.id,
                error:% = err;
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
                        error:% = cleanup_err;
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
        let email = Email::parse(&email).map_err(VerifyResetCodeError::from)?;

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
                        error:% = restore_err;
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
                    error:% = restore_err;
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
                error:% = err;
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
                PasswordResetState::from_payload(&payload)
                    .map(|state| StoredPasswordResetState { payload, state })
                    .map_err(|err| {
                        log::error!(
                            target: "features.auth.password_reset.service",
                            location:% = Location::caller(),
                            user_id = user_id,
                            error:% = err;
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
                    error:% = err;
                    "failed to atomically consume password reset key"
                );
                InternalError::new(err)
            })?;

        ConsumedPasswordResetKey::parse_payload(&payload).map_err(|err| {
            log::error!(
                target: "features.auth.password_reset.service",
                location:% = Location::caller(),
                error:% = err;
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
                    error:% = err;
                    "failed to atomically increment password reset failed attempts"
                );
                InternalError::new(err)
            })?;

        Ok(saved == 1)
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
        let payload = next_state.to_payload().map_err(InternalError::new)?;

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
                    error:% = err;
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
                    error:% = err;
                    "failed to compare-and-clear password reset state"
                );
                InternalError::new(err)
            })?;

        Ok(cleared == 1)
    }
}
