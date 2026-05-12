use crate::shared::types::BoxedError;

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("Internal server error")]
pub struct InternalError(#[error(source)] pub BoxedError);

impl InternalError {
    pub fn new(source: impl std::error::Error + Send + Sync + 'static) -> Self {
        Self(Box::new(source))
    }
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("Validation error: {source}")]
pub struct ValidationError<T>
where
    T: std::error::Error + 'static,
{
    #[error(source)]
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

#[derive(Debug, Clone, Copy, derive_more::Display, derive_more::Error)]
#[display("{entity} #{id} not found")]
pub struct EntityNotFound {
    entity: &'static str,
    id: i32,
}

impl EntityNotFound {
    pub const fn new(entity: &'static str, id: i32) -> Self {
        Self { entity, id }
    }
}

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
