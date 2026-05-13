mod http;
mod model;
mod repo;
mod service;

pub use http::router;
pub(crate) use model::HandleImageQueueMethod;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::infra::database::error::DatabaseError;
use crate::shared::error::{InternalError, PermissionDenied};
use crate::shared::http::api_response::AppError;

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
    Internal(InternalError),
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
            Error::Internal(err) => err.into(),
        }
    }
}
