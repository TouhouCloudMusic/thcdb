pub use infra_db::error::{BrokenEntityReference, DatabaseFailure};

impl From<DatabaseError> for DatabaseFailure {
    fn from(source: DatabaseError) -> Self {
        source.0.into()
    }
}

#[derive(Debug, derive_more::Error)]
pub struct DatabaseError(#[error(source)] infra_db::error::DatabaseError);

impl DatabaseError {
    pub fn is_unique_violation(&self) -> bool {
        self.0.is_unique_violation()
    }

    #[track_caller]
    #[must_use]
    pub fn context(self, operation: &'static str) -> Self {
        Self(self.0.context(operation))
    }
}

impl From<infra_db::error::DatabaseError> for DatabaseError {
    fn from(source: infra_db::error::DatabaseError) -> Self {
        Self(source)
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

pub trait DatabaseResultExt<T> {
    #[track_caller]
    fn db_context(self, operation: &'static str) -> Result<T, DatabaseError>;
}

impl<T, E: Into<DatabaseFailure>> DatabaseResultExt<T> for Result<T, E> {
    #[track_caller]
    fn db_context(self, operation: &'static str) -> Result<T, DatabaseError> {
        infra_db::error::DatabaseResultExt::db_context(self, operation)
            .map_err(Into::into)
    }
}
