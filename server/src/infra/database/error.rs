use std::backtrace::Backtrace;

use axum::http::StatusCode;
use frunk::{Coprod, Coproduct};
use itertools::Itertools;
use macros::ApiError;
use sea_orm::{DbErr, RuntimeErr, sqlx};

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

#[derive(Debug, snafu::Snafu, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
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
    backtrace: Backtrace,
}

impl TryFrom<DbErr> for FkViolation<DbErr> {
    type Error = DbErr;

    fn try_from(value: DbErr) -> Result<Self, Self::Error> {
        match value {
            DbErr::Query(RuntimeErr::SqlxError(sqlx::Error::Database(
                ref err,
            ))) if err.is_foreign_key_violation() => {
                let table = err.table().unwrap_or("unknown").to_string();
                Ok(FkViolation {
                    kind: FkViolationKind::Auto { entity: table },
                    source: value,
                    backtrace: Backtrace::capture(),
                })
            }
            err => Err(err),
        }
    }
}
