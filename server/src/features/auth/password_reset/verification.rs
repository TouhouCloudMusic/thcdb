use lettre::message::{Mailbox, Message as EmailMessage};

use super::service::PASSWORD_RESET_CODE_EXPIRES_MINUTES;
use crate::domain::model::VerificationCode;
use crate::features::auth::InvalidEmail;

#[derive(Debug)]
pub(crate) enum SendPasswordResetEmailError {
    Unavailable,
    InvalidEmail(InvalidEmail),
}

pub(crate) fn build_password_reset_email_message(
    from: Mailbox,
    to: Mailbox,
    code: VerificationCode<6>,
) -> Result<EmailMessage, SendPasswordResetEmailError> {
    EmailMessage::builder()
        .from(from)
        .to(to)
        .subject("Reset your password")
        .body(format!(
            "Your password reset code is {code}. It expires in {PASSWORD_RESET_CODE_EXPIRES_MINUTES} minutes."
        ))
        .map_err(|err| {
            log::error!(
                target: "features.auth.password_reset.verification",
                error:% = err;
                "failed to build password reset email"
            );
            SendPasswordResetEmailError::Unavailable
        })
}
