mod http;
mod model;
mod repo;
mod service;

use axum::response::IntoResponse;
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
    PermissionDenied,
    #[from]
    Database(DatabaseError),
    #[from]
    Internal(InternalError),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::NotFound => {
                AppError::not_found("Image queue entry not found")
                    .into_response()
            }
            Error::InvalidOperation => {
                AppError::bad_request("Invalid operation").into_response()
            }
            Error::InvalidEntry => {
                AppError::bad_request("Invalid image queue entry")
                    .into_response()
            }
            Error::UnknownTarget => {
                AppError::bad_request("Unknown image queue target")
                    .into_response()
            }
            Error::AmbiguousTarget => {
                AppError::bad_request("Ambiguous image queue target")
                    .into_response()
            }
            Error::PermissionDenied => PermissionDenied.into_response(),
            Error::Database(err) => err.into_response(),
            Error::Internal(err) => err.into_response(),
        }
    }
}
