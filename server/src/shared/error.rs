use snafu::Snafu;

use crate::shared::http;

#[derive(Debug, Snafu)]
#[snafu(display("Validation error: {source}"))]
pub struct ValidationError<T>
where
    T: std::error::Error + 'static,
{
    pub source: T,
}

impl<T> From<T> for ValidationError<T>
where
    T: std::error::Error + 'static,
{
    fn from(source: T) -> Self {
        Self { source }
    }
}

impl<T> From<ValidationError<T>> for http::Error<ValidationError<T>>
where
    T: std::error::Error + 'static,
{
    fn from(err: ValidationError<T>) -> Self {
        http::Error::bad_request(err)
    }
}

#[derive(Debug)]
pub struct MessageError(String);

impl MessageError {
    pub fn new(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl std::fmt::Display for MessageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for MessageError {}

impl ValidationError<MessageError> {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            source: MessageError::new(message),
        }
    }
}

pub type MessageValidationError = ValidationError<MessageError>;

#[derive(Debug, Clone, Copy, derive_more::Display, derive_more::Error)]
#[display("Permission denied")]
pub struct PermissionDenied;

#[derive(Debug, Clone, derive_more::Display, derive_more::Error)]
#[display("{message}")]
pub struct InvalidInput {
    message: String,
}

impl InvalidInput {
    pub fn new(message: &impl ToString) -> Self {
        let message = message.to_string();
        Self { message }
    }
}
