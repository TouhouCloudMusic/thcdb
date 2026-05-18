use lettre::message::{Mailbox, Message as EmailMessage};

use crate::features::auth::{InvalidEmail, VerificationCode};

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
    auth_core::password_reset::build_password_reset_email_message(
        from, to, code,
    )
    .map_err(|err| {
        log::error!(
            target: "features.auth.password_reset.verification",
            error:% = err;
            "failed to build password reset email"
        );
        SendPasswordResetEmailError::Unavailable
    })
}
