use std::panic::Location;

use derive_more::{Display, Error};

#[cfg(test)]
mod tests;

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

#[derive(Debug, Clone, Copy, Display)]
#[display("{operation} at {location}")]
pub struct OperationContext {
    operation: &'static str,
    location: &'static Location<'static>,
}

impl OperationContext {
    #[track_caller]
    pub const fn new(operation: &'static str) -> Self {
        Self {
            operation,
            location: Location::caller(),
        }
    }
}

#[derive(Debug, Display, Error)]
#[display("Failed to {context}: {source}")]
pub struct ContextError {
    context: OperationContext,
    #[error(source)]
    source: BoxedError,
}

impl ContextError {
    #[track_caller]
    pub fn new(operation: &'static str, source: impl Into<BoxedError>) -> Self {
        Self {
            context: OperationContext::new(operation),
            source: source.into(),
        }
    }
}

pub trait ResultExt<T> {
    #[track_caller]
    fn context(self, operation: &'static str) -> Result<T, ContextError>;
}

impl<T, E: Into<BoxedError>> ResultExt<T> for Result<T, E> {
    #[track_caller]
    fn context(self, operation: &'static str) -> Result<T, ContextError> {
        let context = OperationContext::new(operation);
        self.map_err(|source| ContextError {
            context,
            source: source.into(),
        })
    }
}
