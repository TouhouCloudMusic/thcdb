use std::panic::Location;

use frunk::{Coprod, Coproduct};
use itertools::Itertools;
use sea_orm::{DbErr, RuntimeErr, sqlx};

#[derive(Debug, derive_more::Error)]
pub struct DatabaseError {
    #[error(source)]
    source: DbErr,
    frames: Vec<DatabaseErrorFrame>,
    location: &'static Location<'static>,
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
            source,
            frames: Vec::new(),
            location: Location::caller(),
        }
    }

    #[track_caller]
    pub fn with_operation(mut self, operation: &'static str) -> Self {
        self.frames.push(DatabaseErrorFrame {
            operation,
            location: Location::caller(),
        });
        self
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.frames.last() {
            Some(frame) => write!(
                f,
                "database error while {} at {}",
                frame.operation, frame.location
            ),
            None => write!(f, "database error at {}", self.location),
        }
    }
}

pub trait DatabaseResultExt<T> {
    fn with_operation(
        self,
        operation: &'static str,
    ) -> Result<T, DatabaseError>;
}

impl<T> DatabaseResultExt<T> for Result<T, DbErr> {
    #[track_caller]
    fn with_operation(
        self,
        operation: &'static str,
    ) -> Result<T, DatabaseError> {
        self.map_err(|err| DatabaseError::new(err).with_operation(operation))
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

#[derive(Debug, snafu::Snafu)]
#[snafu(display("{}", match &self.kind {
    FkViolationKind::Auto { entity } => format!("Invalid relation on {entity}"),
    FkViolationKind::Manual { entity, target } => format!(
        "Invalid relation between {} {} and {} {}",
        entity.0, entity.1, target.0, target.1
    ),
}))]
pub struct FkViolation<T>
where
    T: 'static + std::error::Error,
{
    pub kind: FkViolationKind,
    pub source: T,
    location: &'static Location<'static>,
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
