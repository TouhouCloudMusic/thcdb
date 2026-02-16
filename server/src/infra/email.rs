use lettre::message::{Mailbox, Message};
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

#[non_exhaustive]
#[derive(Clone)]
pub struct Mailer {
    pub(super) transport: AsyncSmtpTransport<Tokio1Executor>,
    pub(super) from: Mailbox,
}

impl Mailer {
    pub const fn new(
        transport: AsyncSmtpTransport<Tokio1Executor>,
        from: Mailbox,
    ) -> Self {
        Self { transport, from }
    }

    pub const fn from(&self) -> &Mailbox {
        &self.from
    }

    pub async fn send(
        &self,
        message: Message,
    ) -> Result<(), lettre::transport::smtp::Error> {
        self.transport.send(message).await?;
        Ok(())
    }
}
