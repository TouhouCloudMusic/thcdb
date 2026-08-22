use std::panic::Location;

use frunk::{Coprod, Coproduct};
use itertools::Itertools;
use sea_orm::{DbErr, RuntimeErr, sqlx};

type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(Debug, Clone, Copy, derive_more::Display, derive_more::Error)]
#[display("Broken entity reference: {entity} #{id} not found")]
pub struct BrokenEntityReference {
    pub entity: &'static str,
    pub id: i32,
}

#[derive(Debug, derive_more::Error)]
pub struct DatabaseError {
    #[error(source)]
    source: DatabaseErrorSource,
    frames: Vec<DatabaseErrorFrame>,
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

#[derive(Debug)]
struct DatabaseErrorFrame {
    operation: &'static str,
    location: &'static Location<'static>,
}

impl DatabaseError {
    #[track_caller]
    pub const fn new(source: DbErr) -> Self {
        Self {
            source: DatabaseErrorSource::Db(source),
            frames: Vec::new(),
            location: Location::caller(),
        }
    }

    #[track_caller]
    pub fn broken_reference(
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self {
            source: DatabaseErrorSource::BrokenReference(Box::new(source)),
            frames: Vec::new(),
            location: Location::caller(),
        }
    }

    #[track_caller]
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            source: DatabaseErrorSource::Internal(message.into()),
            frames: Vec::new(),
            location: Location::caller(),
        }
    }

    #[track_caller]
    #[must_use]
    pub fn db_operation(mut self, operation: &'static str) -> Self {
        self.frames.push(DatabaseErrorFrame {
            operation,
            location: Location::caller(),
        });
        self
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
        match self.frames.last() {
            Some(frame) => write!(
                f,
                "database error while {} at {}: {}",
                frame.operation, frame.location, self.source
            ),
            None => write!(
                f,
                "database error at {}: {}",
                self.location, self.source
            ),
        }
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

impl<T> DatabaseResultExt<T> for Result<T, DatabaseError> {
    #[track_caller]
    fn db_operation(self, operation: &'static str) -> Result<T, DatabaseError> {
        self.map_err(|err| err.db_operation(operation))
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
