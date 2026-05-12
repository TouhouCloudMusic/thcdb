mod http;
mod model;
mod repo;
mod service;

pub use http::router;
pub(crate) use model::HandleImageQueueMethod;
use sea_orm::DbErr;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::infra::database::error::DatabaseError;
use crate::infra::error::Error as InfraError;
use crate::shared::error::PermissionDenied;
use crate::shared::http::api_response::AppError;
use crate::shared::types::BoxedError;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum ImageQueueType {
    Artist,
    Release,
}

#[derive(Debug, derive_more::From)]
pub(crate) enum Error {
    NotFound,
    InvalidOperation,
    InvalidEntry,
    UnknownTarget,
    AmbiguousTarget,
    PublishedNotFound,
    PermissionDenied,
    #[from]
    Database(DatabaseError),
    #[from]
    Infra(InfraError),
}

impl From<BoxedError> for Error {
    fn from(source: BoxedError) -> Self {
        Self::Infra(source.into())
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Database(
            DatabaseError::new(err)
                .with_operation("image queue management database operation"),
        )
    }
}

impl From<Error> for AppError {
    fn from(err: Error) -> Self {
        match err {
            Error::NotFound => {
                AppError::not_found("Image queue entry not found")
            }
            Error::InvalidOperation => {
                AppError::bad_request("Invalid operation")
            }
            Error::InvalidEntry => {
                AppError::bad_request("Invalid image queue entry")
            }
            Error::UnknownTarget => {
                AppError::bad_request("Unknown image queue target")
            }
            Error::AmbiguousTarget => {
                AppError::bad_request("Ambiguous image queue target")
            }
            Error::PublishedNotFound => {
                AppError::conflict("Published image record not found")
            }
            Error::PermissionDenied => PermissionDenied.into(),
            Error::Database(err) => err.into(),
            Error::Infra(err) => err.into(),
        }
    }
}
