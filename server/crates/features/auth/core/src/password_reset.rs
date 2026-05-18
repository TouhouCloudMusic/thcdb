use std::fmt::Display;

use chrono::{DateTime, Duration, FixedOffset};
use lettre::message::{Mailbox, Message as EmailMessage};
use serde::{Deserialize, Serialize};

pub const PASSWORD_RESET_EMAIL_KEY: &str = "auth:password-reset:email";
pub const PASSWORD_RESET_CODE_MAX_FAILED_ATTEMPTS: i32 = 10;
pub const PASSWORD_RESET_CODE_EXPIRES_MINUTES: i64 = 10;
pub const PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS: i64 = 60;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PasswordResetEmailJob {
    pub user_id: i32,
    pub email: String,
    pub code: String,
    pub code_hash: String,
    pub code_expires_at: DateTime<FixedOffset>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum PasswordResetState {
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
    pub fn awaiting_code(
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

    pub fn is_in_code_resend_cooldown(
        &self,
        now: DateTime<FixedOffset>,
    ) -> bool {
        let Self::AwaitingCode { code_sent_at, .. } = self else {
            return false;
        };

        now - *code_sent_at
            < Duration::seconds(PASSWORD_RESET_CODE_RESEND_COOLDOWN_SECONDS)
    }

    pub fn verifiable_code_hash(
        &self,
        now: DateTime<FixedOffset>,
    ) -> Option<&str> {
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

    #[must_use]
    pub const fn increment_failed_attempts(mut self) -> Self {
        if let Self::AwaitingCode {
            failed_attempts, ..
        } = &mut self
        {
            *failed_attempts += 1;
        }

        self
    }

    pub fn index_key(&self) -> Option<String> {
        match self {
            Self::AwaitingCode { .. } => None,
            Self::AwaitingPassword { reset_key_hash, .. } => {
                Some(password_reset_key_index_key(reset_key_hash))
            }
        }
    }

    pub fn ttl_seconds(&self, now: DateTime<FixedOffset>) -> Option<i64> {
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

    pub fn to_payload(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }

    pub fn from_payload(payload: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(payload)
    }
}

pub fn password_reset_state_key(user_id: i32) -> String {
    format!("auth:password-reset:user:{user_id}")
}

pub fn password_reset_key_index_key(reset_key_hash: &str) -> String {
    format!("auth:password-reset:key:{reset_key_hash}")
}

pub fn is_password_reset_code(input: &str) -> bool {
    input.len() == 6 && input.bytes().all(|byte| byte.is_ascii_digit())
}

pub fn build_password_reset_email_message(
    from: Mailbox,
    to: Mailbox,
    code: impl Display,
) -> Result<EmailMessage, lettre::error::Error> {
    EmailMessage::builder()
        .from(from)
        .to(to)
        .subject("Reset your password")
        .body(format!(
            "Your password reset code is {code}. It expires in {PASSWORD_RESET_CODE_EXPIRES_MINUTES} minutes."
        ))
}
