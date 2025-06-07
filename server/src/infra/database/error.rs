use axum::http::StatusCode;
use frunk::{Coprod, Coproduct};
use itertools::Itertools;
use macros::ApiError;
use sea_orm::{DbErr, RuntimeErr, sqlx};

pub enum SeaOrmError {
    General(DbErr),
    FkViolation(FkViolation<DbErr>),
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

#[derive(Debug, thiserror::Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
pub enum FkViolation<T>
where
    T: 'static + std::error::Error,
{
    #[error("Invalid relation on {entity}")]
    Auto { entity: String, source: T },
    #[error(
        "Invalid relation between {} {} and {} {}",
        entity.0, entity.1, target.0, target.1
    )]
    Manual {
        entity: (String, i32),
        target: (String, IdOrIds),
        source: T,
    },
}

impl TryFrom<DbErr> for FkViolation<DbErr> {
    type Error = DbErr;

    fn try_from(value: DbErr) -> Result<Self, Self::Error> {
        match value {
            DbErr::Query(RuntimeErr::SqlxError(sqlx::Error::Database(
                ref err,
            ))) if err.is_foreign_key_violation() => {
                let table = err.table().unwrap_or("unknown").to_string();
                Ok(FkViolation::Auto {
                    entity: table,
                    source: value,
                })
            }
            err => Err(err),
        }
    }
}
