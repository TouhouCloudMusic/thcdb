use ::sea_orm::DbErr;

use crate::shared::error::BrokenEntityReference;

#[derive(Debug, derive_more::Error)]
pub struct DatabaseError(#[error(source)] infra_db::error::DatabaseError);

impl DatabaseError {
    #[track_caller]
    pub const fn new(source: DbErr) -> Self {
        Self(infra_db::error::DatabaseError::new(source))
    }

    #[track_caller]
    pub fn broken_reference(
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self(infra_db::error::DatabaseError::broken_reference(source))
    }

    #[track_caller]
    pub fn internal(message: impl Into<String>) -> Self {
        Self(infra_db::error::DatabaseError::internal(message))
    }

    #[track_caller]
    #[must_use]
    pub fn db_operation(self, operation: &'static str) -> Self {
        Self(self.0.db_operation(operation))
    }
}

impl From<infra_db::error::DatabaseError> for DatabaseError {
    #[track_caller]
    fn from(source: infra_db::error::DatabaseError) -> Self {
        Self(source)
    }
}

impl From<DbErr> for DatabaseError {
    #[track_caller]
    fn from(source: DbErr) -> Self {
        Self::new(source)
    }
}

impl From<BrokenEntityReference> for DatabaseError {
    #[track_caller]
    fn from(source: BrokenEntityReference) -> Self {
        Self::broken_reference(source)
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

pub trait DatabaseResultExt<T> {
    fn db_operation(self, operation: &'static str) -> Result<T, DatabaseError>;
}

impl<T> DatabaseResultExt<T> for Result<T, DbErr> {
    #[track_caller]
    fn db_operation(self, operation: &'static str) -> Result<T, DatabaseError> {
        self.map_err(|err| DatabaseError::new(err).db_operation(operation))
    }
}

impl<T> DatabaseResultExt<T> for Result<T, infra_db::error::DatabaseError> {
    #[track_caller]
    fn db_operation(self, operation: &'static str) -> Result<T, DatabaseError> {
        self.map_err(|err| DatabaseError::from(err).db_operation(operation))
    }
}

impl<T> DatabaseResultExt<T> for Result<T, DatabaseError> {
    #[track_caller]
    fn db_operation(self, operation: &'static str) -> Result<T, DatabaseError> {
        self.map_err(|err| err.db_operation(operation))
    }
}
