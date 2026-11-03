use std::error::Error as _;
use std::panic::Location;

use frunk::{Coprod, Coproduct};
use infra_error::{BoxedError, OperationContext};
use itertools::Itertools;
use sea_orm::{DbErr, RuntimeErr, SqlErr, sqlx};

#[derive(Debug, Clone, Copy, derive_more::Display, derive_more::Error)]
#[display("Broken entity reference: {entity} #{id} not found")]
pub struct BrokenEntityReference {
    pub entity: &'static str,
    pub id: i32,
}

#[derive(Debug)]
pub struct DatabaseFailure(DatabaseFailureKind);

#[derive(Debug)]
enum DatabaseFailureKind {
    Raw {
        source: DatabaseErrorSource,
        location: &'static Location<'static>,
    },
    Child(DatabaseError),
}

impl DatabaseFailure {
    #[track_caller]
    pub const fn new(source: DbErr) -> Self {
        Self(DatabaseFailureKind::Raw {
            source: DatabaseErrorSource::Db(source),
            location: Location::caller(),
        })
    }

    #[track_caller]
    pub fn broken_reference(
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self(DatabaseFailureKind::Raw {
            source: DatabaseErrorSource::BrokenReference(Box::new(source)),
            location: Location::caller(),
        })
    }

    #[track_caller]
    pub fn internal(message: impl Into<String>) -> Self {
        Self(DatabaseFailureKind::Raw {
            source: DatabaseErrorSource::Internal(message.into()),
            location: Location::caller(),
        })
    }

    #[track_caller]
    #[must_use]
    pub fn context(self, operation: &'static str) -> DatabaseError {
        DatabaseError::attach_context(self, OperationContext::new(operation))
    }
}

impl From<DbErr> for DatabaseFailure {
    #[track_caller]
    fn from(source: DbErr) -> Self {
        Self::new(source)
    }
}

impl From<BrokenEntityReference> for DatabaseFailure {
    #[track_caller]
    fn from(source: BrokenEntityReference) -> Self {
        Self::broken_reference(source)
    }
}

impl From<DatabaseError> for DatabaseFailure {
    fn from(source: DatabaseError) -> Self {
        Self(DatabaseFailureKind::Child(source))
    }
}

/// A database error with at least one operation context.
///
/// Raw database failures cannot be converted without an operation context.
/// ```compile_fail
/// use infra_db::error::DatabaseError;
/// let error: DatabaseError = sea_orm::DbErr::Custom("failure".into()).into();
/// ```
/// ```compile_fail
/// use infra_db::error::{DatabaseError, DatabaseFailure};
/// let error: DatabaseError = DatabaseFailure::internal("failure").into();
/// ```
#[derive(Debug, derive_more::Error)]
pub struct DatabaseError {
    #[error(source)]
    source: DatabaseErrorSource,
    first_context: OperationContext,
    parents: Vec<OperationContext>,
    location: &'static Location<'static>,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
enum DatabaseErrorSource {
    #[display("{_0}")]
    Db(#[error(source)] DbErr),
    #[display("{_0}")]
    BrokenReference(#[error(source)] BoxedError),
    #[display("{_0}")]
    Internal(#[error(ignore)] String),
}

impl DatabaseError {
    pub fn is_unique_violation(&self) -> bool {
        matches!(
            &self.source,
            DatabaseErrorSource::Db(error)
                if matches!(error.sql_err(), Some(SqlErr::UniqueConstraintViolation(_)))
        )
    }

    #[track_caller]
    #[must_use]
    pub fn context(self, operation: &'static str) -> Self {
        Self::attach_context(self.into(), OperationContext::new(operation))
    }
}

impl DatabaseError {
    pub fn attach_context(
        input: DatabaseFailure,
        context: OperationContext,
    ) -> Self {
        match input.0 {
            DatabaseFailureKind::Raw { source, location } => Self {
                source,
                location,
                first_context: context,
                parents: Vec::new(),
            },
            DatabaseFailureKind::Child(mut error) => {
                error.parents.push(context);
                error
            }
        }
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "database error\n\nCaused by:")?;
        for (index, context) in self
            .parents
            .iter()
            .rev()
            .chain(std::iter::once(&self.first_context))
            .enumerate()
        {
            write!(f, "\n    {index}: {context}")?;
        }
        let mut index = self.parents.len() + 1;
        write!(
            f,
            "\n    {index}: {} (origin at {})",
            self.source, self.location
        )?;
        let mut cause: Option<&(dyn std::error::Error + 'static)> =
            match &self.source {
                DatabaseErrorSource::Db(error) => error.source(),
                DatabaseErrorSource::BrokenReference(error) => error.source(),
                DatabaseErrorSource::Internal(_) => None,
            };
        while let Some(error) = cause {
            index += 1;
            write!(f, "\n    {index}: {error}")?;
            cause = error.source();
        }
        Ok(())
    }
}

pub trait DatabaseResultExt<T> {
    #[track_caller]
    fn db_context(self, operation: &'static str) -> Result<T, DatabaseError>;
}

impl<T, E: Into<DatabaseFailure>> DatabaseResultExt<T> for Result<T, E> {
    #[track_caller]
    fn db_context(self, operation: &'static str) -> Result<T, DatabaseError> {
        match self {
            Ok(value) => Ok(value),
            Err(error) => Err(error.into().context(operation)),
        }
    }
}

#[derive(Debug)]
pub struct IdOrIds(Coprod!(i32, Vec<i32>));

impl std::fmt::Display for IdOrIds {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.0 {
            Coproduct::Inl(id) => write!(f, "{id}"),
            Coproduct::Inr(ids) => {
                write!(f, "[{}]", ids.to_ref().extract().iter().join(", "))
            }
        }
    }
}

#[derive(Debug)]
pub enum FkViolationKind {
    Auto {
        entity: String,
    },
    Manual {
        entity: (String, i32),
        target: (String, IdOrIds),
    },
}

#[derive(Debug, derive_more::Error)]
pub struct FkViolation<T>
where
    T: 'static + std::error::Error,
{
    pub kind: FkViolationKind,
    pub source: T,
    location: &'static Location<'static>,
}

impl<T> std::fmt::Display for FkViolation<T>
where
    T: 'static + std::error::Error,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.kind {
            FkViolationKind::Auto { entity } => {
                write!(f, "Invalid relation on {entity}")
            }
            FkViolationKind::Manual { entity, target } => write!(
                f,
                "Invalid relation between {} {} and {} {}",
                entity.0, entity.1, target.0, target.1
            ),
        }
    }
}

impl TryFrom<DbErr> for FkViolation<DbErr> {
    type Error = DbErr;

    #[track_caller]
    fn try_from(value: DbErr) -> Result<Self, Self::Error> {
        match value {
            DbErr::Query(RuntimeErr::SqlxError(sqlx::Error::Database(
                ref err,
            ))) if err.is_foreign_key_violation() => {
                let table = err.table().unwrap_or("unknown").to_string();
                Ok(FkViolation {
                    kind: FkViolationKind::Auto { entity: table },
                    source: value,
                    location: Location::caller(),
                })
            }
            err => Err(err),
        }
    }
}
