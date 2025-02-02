mod error_code;
mod structs;
use std::fmt::Debug;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use entity::sea_orm_active_enums::EntityType;
pub use error_code::*;
use error_set::error_set;
pub use structs::*;
use utoipa::IntoResponses;

use crate::api_response::{ErrResponseDef, IntoApiResponse, StatusCodeExt};

error_set! {
    ApiError = {
        Unauthorized
    };
    #[disable(From(TokioError))]
    RepositoryError = {
        #[display("Database error")]
        Database(sea_orm::DbErr),
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
    };
    TokioError = {
        TaskJoin(tokio::task::JoinError)
    };
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
        }
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

impl StatusCodeExt for RepositoryError {
    fn as_status_code(&self) -> StatusCode {
        match self {
            Self::Tokio(_)
            | Self::Database(_)
            | Self::UnexpRelatedEntityNotFound { .. } => {
                StatusCode::INTERNAL_SERVER_ERROR
            }
            Self::InvalidField { .. }
            | Self::IncorrectCorrectionType { .. } => StatusCode::BAD_REQUEST,
            Self::EntityNotFound { .. } => StatusCode::NOT_FOUND,
        }
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [
            StatusCode::BAD_REQUEST,
            StatusCode::NOT_FOUND,
            StatusCode::INTERNAL_SERVER_ERROR,
        ]
        .into_iter()
    }
}

impl IntoResponse for RepositoryError {
    fn into_response(self) -> axum::response::Response {
        match &self {
            Self::Database(db_err) => {
                tracing::error!("Database error: {}", db_err);
            }
            Self::Tokio(tokio_err) => {
                tracing::error!("Tokio error: {}", tokio_err);
            }
            _ => (),
        }

        self.into_api_response()
    }
}

impl IntoResponses for RepositoryError {
    fn responses() -> std::collections::BTreeMap<
        String,
        utoipa::openapi::RefOr<utoipa::openapi::response::Response>,
    > {
        Self::build_err_responses().into()
    }
}
