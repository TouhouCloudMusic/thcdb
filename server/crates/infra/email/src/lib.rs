use std::error::Error as StdError;

use domain::email::Email;
use lettre::message::{Mailbox, Message};
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("email delivery failed: {source}")]
pub struct DeliveryFailure {
    retryable: bool,
    #[error(source)]
    source: Box<dyn StdError + Send + Sync>,
}

impl DeliveryFailure {
    pub fn retryable(error: impl StdError + Send + Sync + 'static) -> Self {
        Self {
            retryable: true,
            source: Box::new(error),
        }
    }

    pub fn permanent(error: impl StdError + Send + Sync + 'static) -> Self {
        Self {
            retryable: false,
            source: Box::new(error),
        }
    }

    #[must_use]
    pub const fn is_retryable(&self) -> bool {
        self.retryable
    }
}

impl From<lettre::address::AddressError> for DeliveryFailure {
    fn from(error: lettre::address::AddressError) -> Self {
        Self::permanent(error)
    }
}

impl From<lettre::error::Error> for DeliveryFailure {
    fn from(error: lettre::error::Error) -> Self {
        Self::permanent(error)
    }
}

impl From<lettre::transport::smtp::Error> for DeliveryFailure {
    fn from(error: lettre::transport::smtp::Error) -> Self {
        let retryable =
            !(error.is_permanent() || error.is_client() || error.is_tls());

        Self {
            retryable,
            source: Box::new(error),
        }
    }
}

#[non_exhaustive]
#[derive(Clone)]
pub struct Mailer {
    transport: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

impl Mailer {
    #[must_use]
    pub const fn new(
        transport: AsyncSmtpTransport<Tokio1Executor>,
        from: Mailbox,
    ) -> Self {
        Self { transport, from }
    }

    #[must_use]
    pub const fn from(&self) -> &Mailbox {
        &self.from
    }

    pub fn build_message(
        &self,
        recipient: &Email,
        subject: impl Into<String>,
        body: String,
    ) -> Result<Message, DeliveryFailure> {
        let recipient: Mailbox = recipient.as_str().parse()?;

        Ok(Message::builder()
            .from(self.from.clone())
            .to(recipient)
            .subject(subject)
            .body(body)?)
    }

    pub async fn send(&self, message: Message) -> Result<(), DeliveryFailure> {
        self.transport.send(message).await?;
        Ok(())
    }
}
