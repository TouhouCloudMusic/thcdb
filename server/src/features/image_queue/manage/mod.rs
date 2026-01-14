mod http;
mod repo;

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
pub use http::router;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::adapter::inbound::rest::api_response::Error as ApiError;
use crate::infra::error::Error as InfraError;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
enum ImageQueueType {
    Artist,
    Release,
}

#[derive(Debug)]
enum Error {
    NotFound,
    InvalidOperation,
    InvalidEntry,
    UnknownTarget,
    AmbiguousTarget,
    PublishedNotFound,
    Infra(InfraError),
}

impl From<InfraError> for Error {
    fn from(err: InfraError) -> Self {
        Self::Infra(err)
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::NotFound => ApiError::from_err_and_code(
                "Image queue entry not found",
                StatusCode::NOT_FOUND,
            )
            .into_response(),
            Self::InvalidOperation => ApiError::from_err_and_code(
                "Invalid operation",
                StatusCode::BAD_REQUEST,
            )
            .into_response(),
            Self::InvalidEntry => ApiError::from_err_and_code(
                "Invalid image queue entry",
                StatusCode::BAD_REQUEST,
            )
            .into_response(),
            Self::UnknownTarget => ApiError::from_err_and_code(
                "Unknown image queue target",
                StatusCode::BAD_REQUEST,
            )
            .into_response(),
            Self::AmbiguousTarget => ApiError::from_err_and_code(
                "Ambiguous image queue target",
                StatusCode::BAD_REQUEST,
            )
            .into_response(),
            Self::PublishedNotFound => ApiError::from_err_and_code(
                "Published image record not found",
                StatusCode::CONFLICT,
            )
            .into_response(),
            Self::Infra(err) => err.into_response(),
        }
    }
}
