use std::io;

use auth_core::password_reset::EmailSender;
use auth_core::verification_code::VerificationCode;
use domain::email::Email;
use infra_email::DeliveryFailure;
use tokio::sync::mpsc;

pub type RecordedEmails = mpsc::UnboundedReceiver<(Email, VerificationCode<6>)>;

#[derive(Clone)]
pub struct RecordingEmailSender {
    sent_emails: mpsc::UnboundedSender<(Email, VerificationCode<6>)>,
}

impl RecordingEmailSender {
    #[must_use]
    pub fn channel() -> (Self, RecordedEmails) {
        let (sent_emails, receiver) = mpsc::unbounded_channel();

        (Self { sent_emails }, receiver)
    }
}

impl EmailSender for RecordingEmailSender {
    async fn send(
        &self,
        recipient: Email,
        code: VerificationCode<6>,
    ) -> Result<(), DeliveryFailure> {
        self.sent_emails.send((recipient, code)).map_err(|_| {
            DeliveryFailure::permanent(io::Error::other(
                "email receiver closed",
            ))
        })
    }
}
