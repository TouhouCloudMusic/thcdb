use chrono::{Duration, Utc};
use lettre::message::{Mailbox, Message as EmailMessage};

use crate::domain::auth::{
    SIGNUP_EXPIRES_HOURS, VERIFICATION_CODE_EXPIRES_MINUTES,
};
use crate::domain::user::User;
use crate::features::auth::repo::EmailVerificationMutationError;
use crate::features::auth::{
    InvalidEmail, ResendVerificationEmailError, SignUpError,
};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;

#[derive(Debug, derive_more::From)]
pub(super) enum SendVerificationEmailError {
    #[from]
    Internal(InternalError),
    Unavailable,
    #[from]
    InvalidEmail(InvalidEmail),
}

impl From<DatabaseError> for SendVerificationEmailError {
    fn from(value: DatabaseError) -> Self {
        Self::Internal(InternalError::new(value))
    }
}

impl From<EmailVerificationMutationError> for SendVerificationEmailError {
    fn from(value: EmailVerificationMutationError) -> Self {
        match value {
            EmailVerificationMutationError::Database(source) => source.into(),
            EmailVerificationMutationError::UserNotFound
            | EmailVerificationMutationError::EmailVerificationNotFound => {
                InternalError::new(value).into()
            }
        }
    }
}

impl From<SendVerificationEmailError> for SignUpError {
    fn from(value: SendVerificationEmailError) -> Self {
        match value {
            SendVerificationEmailError::Unavailable => {
                SignUpError::EmailServiceUnavailable
            }
            SendVerificationEmailError::InvalidEmail(source) => {
                SignUpError::InvalidEmail(source)
            }
            SendVerificationEmailError::Internal(source) => source.into(),
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
                ResendVerificationEmailError::InvalidEmail(source)
            }
            SendVerificationEmailError::Internal(source) => source.into(),
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
            log::error!(
                target: "features.auth.sign_up.verification",
                error:% = err;
                "failed to build verification email"
            );
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
