mod error_code;
mod structs;
use std::fmt::{Debug, Display};

use axum::http::StatusCode;
use axum::response::IntoResponse;
use entity::sea_orm_active_enums::EntityType;
pub use error_code::*;
use error_set::error_set;
use itertools::Itertools;
use macros::IntoErrorSchema;
use sea_orm::DbErr;
pub use structs::*;

use crate::api_response::{IntoApiResponse, StatusCodeExt};

error_set! {
    ApiError = {
        Unauthorized
    };
    #[disable(From(TokioError))]
    #[derive(IntoErrorSchema)]
    RepositoryError = {
        Database(DbErrWrapper),
        Tokio(TokioError),
        #[display("Entity {entity_name} not found")]
        EntityNotFound {
            entity_name: &'static str
        },
        InvalidField(InvalidField),

        #[display("Correction type mismatch, expected: {:#?}, accepted: {:#?}", expected, accepted)]
        IncorrectCorrectionType {
            expected: EntityType,
            accepted: EntityType,
        },
        #[display("Unexpected error: related entity {entity_name} not found")]
        UnexpRelatedEntityNotFound {
            entity_name: &'static str
        },
        Unauthorized
    };
    TokioError = {
        TaskJoin(tokio::task::JoinError)
    };
}

pub trait ApiErrorTrait: StatusCodeExt + AsErrorCode {
    fn before_into_api_error(&self) {}
}

#[derive(Debug, IntoErrorSchema)]
pub struct DbErrWrapper(DbErr);

impl From<DbErr> for DbErrWrapper {
    fn from(value: DbErr) -> Self {
        Self(value)
    }
}

impl Display for DbErrWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Database error")
    }
}

impl std::error::Error for DbErrWrapper {}

impl StatusCodeExt for DbErrWrapper {
    fn as_status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [StatusCode::INTERNAL_SERVER_ERROR].into_iter()
    }
}

impl AsErrorCode for DbErrWrapper {
    fn as_error_code(&self) -> ErrorCode {
        ErrorCode::DatabaseError
    }
}

impl ApiErrorTrait for DbErrWrapper {
    fn before_into_api_error(&self) {
        tracing::error!("Database error: {}", self);
    }
}

impl IntoResponse for DbErrWrapper {
    fn into_response(self) -> axum::response::Response {
        self.into_api_response()
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
        }
    }
}

impl StatusCodeExt for TokioError {
    fn as_status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [StatusCode::INTERNAL_SERVER_ERROR].into_iter()
    }
}

impl AsErrorCode for TokioError {
    fn as_error_code(&self) -> ErrorCode {
        ErrorCode::TokioError
    }
}

impl ApiErrorTrait for TokioError {
    fn before_into_api_error(&self) {
        tracing::error!("Tokio error: {}", self);
    }
}

impl<T> From<T> for RepositoryError
where
    T: Into<TokioError>,
{
    fn from(value: T) -> Self {
        Self::Tokio(value.into())
    }
}

impl From<DbErr> for RepositoryError {
    fn from(value: DbErr) -> Self {
        Self::Database(DbErrWrapper(value))
    }
}

impl StatusCodeExt for RepositoryError {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Tokio(e) => e.as_status_code(),
            Self::Database(e) => e.as_status_code(),
            Self::UnexpRelatedEntityNotFound { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::InvalidField { .. }
            | Self::IncorrectCorrectionType { .. } => StatusCode::BAD_REQUEST,
            Self::EntityNotFound { .. } => StatusCode::NOT_FOUND,
            Self::Unauthorized => StatusCode::UNAUTHORIZED,
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [
            StatusCode::BAD_REQUEST,
            StatusCode::NOT_FOUND,
            StatusCode::INTERNAL_SERVER_ERROR,
            StatusCode::UNAUTHORIZED,
        ]
        .into_iter()
        .chain(DbErrWrapper::all_status_codes())
        .chain(TokioError::all_status_codes())
        .unique()
    }
}

impl ApiErrorTrait for RepositoryError {}

impl IntoResponse for RepositoryError {
    fn into_response(self) -> axum::response::Response {
        self.into_api_response()
    }
}
