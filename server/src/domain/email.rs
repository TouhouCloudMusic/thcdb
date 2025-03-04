use lettre::message::Message;
use lettre::{AsyncSmtpTransport, AsyncTransport, Tokio1Executor};

#[non_exhaustive]
pub struct Sender {
    transport: AsyncSmtpTransport<Tokio1Executor>,
}

impl Sender {
    pub const fn new(transport: AsyncSmtpTransport<Tokio1Executor>) -> Self {
        Self { transport }
    }

    pub async fn send(
        &self,
        message: Message,
    ) -> Result<(), lettre::transport::smtp::Error> {
        self.transport.send(message).await?;
        Ok(())
    }
}
