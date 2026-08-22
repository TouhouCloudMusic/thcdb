#[derive(Debug, derive_more::Display)]
#[display("{_0}")]
pub struct MessageError(String);

impl MessageError {
    pub fn new(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl std::error::Error for MessageError {}
