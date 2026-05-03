use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use sea_orm::DbErr;

use crate::infra::error::Error as InfraError;
use crate::shared::http::api_response::Error as ApiError;

#[derive(Debug, Clone, Copy)]
pub(in crate::features::correction) enum NotFound {
    Correction,
    Comment,
}

impl NotFound {
    const fn message(self) -> &'static str {
        match self {
            Self::Correction => "Correction not found",
            Self::Comment => "Comment not found",
        }
    }
}

#[derive(Debug)]
pub(in crate::features::correction) enum Error {
    Infra(InfraError),
    NotFound(NotFound),
    PermissionDenied,
    InvalidRequest(String),
}

impl From<InfraError> for Error {
    fn from(err: InfraError) -> Self {
        Self::Infra(err)
    }
}

impl From<DbErr> for Error {
    fn from(err: DbErr) -> Self {
        Self::Infra(err.into())
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Self::Infra(err) => err.into_response(),
            Self::NotFound(kind) => ApiError::from_err_and_code(
                kind.message(),
                StatusCode::NOT_FOUND,
            )
            .into_response(),
            Self::PermissionDenied => ApiError::from_err_and_code(
                "Permission denied",
                StatusCode::FORBIDDEN,
            )
            .into_response(),
            Self::InvalidRequest(message) => {
                ApiError::from_err_and_code(message, StatusCode::BAD_REQUEST)
                    .into_response()
            }
        }
    }
}
