use derive_more::{Display, Error};

pub type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(Debug, Clone, Copy, Display, Error)]
#[display("{entity} #{id} not found")]
pub struct EntityNotFound {
    pub entity: &'static str,
    pub id: i32,
}

impl EntityNotFound {
    pub const fn new(entity: &'static str, id: i32) -> Self {
        Self { entity, id }
    }
}

#[derive(Debug, Display, Error)]
#[display("Failed to {operation}: {source}")]
pub struct ContextError {
    operation: &'static str,
    #[error(source)]
    source: BoxedError,
}

impl ContextError {
    pub fn new(operation: &'static str, source: impl Into<BoxedError>) -> Self {
        Self {
            operation,
            source: source.into(),
        }
    }
}

pub trait ResultExt<T> {
    fn context(self, operation: &'static str) -> Result<T, ContextError>;
}

impl<T, E: Into<BoxedError>> ResultExt<T> for Result<T, E> {
    fn context(self, operation: &'static str) -> Result<T, ContextError> {
        self.map_err(|source| ContextError::new(operation, source))
    }
}
