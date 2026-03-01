use chrono::{Duration, Utc};
use lettre::message::{Mailbox, Message as EmailMessage};

use crate::domain::auth::{
    SIGNUP_EXPIRES_HOURS, VERIFICATION_CODE_EXPIRES_MINUTES,
};
use crate::domain::user::User;
use crate::features::auth::{
    InvalidEmail, ResendVerificationEmailError, SignUpError,
};
use crate::infra::error::Error;

#[derive(Debug)]
pub(super) enum SendVerificationEmailError {
    Infra(Error),
    Unavailable,
    InvalidEmail(InvalidEmail),
}

impl From<Error> for SendVerificationEmailError {
    fn from(value: Error) -> Self {
        Self::Infra(value)
    }
}

impl From<SendVerificationEmailError> for SignUpError {
    fn from(value: SendVerificationEmailError) -> Self {
        match value {
            SendVerificationEmailError::Unavailable => {
                SignUpError::EmailServiceUnavailable
            }
            SendVerificationEmailError::InvalidEmail(source) => {
                SignUpError::InvalidEmail { source }
            }
            SendVerificationEmailError::Infra(source) => {
                SignUpError::Infra { source }
            }
        }
    }
}

impl From<SendVerificationEmailError> for ResendVerificationEmailError {
    fn from(value: SendVerificationEmailError) -> Self {
        match value {
            SendVerificationEmailError::Unavailable => {
                ResendVerificationEmailError::ResendEmailServiceUnavailable
            }
            SendVerificationEmailError::InvalidEmail(source) => {
                ResendVerificationEmailError::InvalidEmail { source }
            }
            SendVerificationEmailError::Infra(source) => {
                ResendVerificationEmailError::Infra { source }
            }
        }
    }
}

pub(super) fn build_verification_email_message(
    from: Mailbox,
    to: Mailbox,
    code: &str,
) -> Result<EmailMessage, SendVerificationEmailError> {
    EmailMessage::builder()
        .from(from)
        .to(to)
        .subject("Verify your email")
        .body(format!(
            "Your verification code is {code}. It expires in {VERIFICATION_CODE_EXPIRES_MINUTES} minutes."
        ))
        .map_err(|err| {
            tracing::error!("Failed to build verification email: {err}");
            SendVerificationEmailError::Unavailable
        })
}

pub(super) fn is_unverified_signup_expired(user: &User) -> bool {
    if user.email_verified {
        return false;
    }

    let now: chrono::DateTime<chrono::FixedOffset> = Utc::now().into();
    let cutoff = now - Duration::hours(SIGNUP_EXPIRES_HOURS);
    user.created_at < cutoff
}
