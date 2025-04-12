mod error_code;
mod structs;

use std::fmt::Debug;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::{Display, Error, From};
use entity::sea_orm_active_enums::EntityType;
pub use error_code::*;
use error_set::error_set;
use macros::{ApiError, IntoErrorSchema};
use sea_orm::DbErr;
pub use structs::*;

use crate::api_response::{
    IntoApiResponse, StatusCodeExt, default_into_api_response_impl,
};

pub trait ApiErrorTrait = StatusCodeExt + AsErrorCode;

pub trait ImpledApiError = std::error::Error
    + ApiErrorTrait
    + IntoApiResponse
    + axum::response::IntoResponse;

error_set! {
    ApiError = {
        Unauthorized
    };
    #[disable(From(TokioError))]
    #[derive(IntoErrorSchema, From, ApiError)]
    ServiceError = {
        #[from(DbErr)]
        Database(DbErrWrapper),
        Tokio(TokioError),
        #[display("Entity {entity_name} not found")]
        #[api_error(
            status_code = StatusCode::INTERNAL_SERVER_ERROR,
            error_code = ErrorCode::EntityNotFound,
        )]
        EntityNotFound {
            entity_name: &'static str
        },
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::InvalidField,
        )]
        InvalidField(InvalidField),
        #[display("Correction type mismatch, expected: {:#?}, accepted: {:#?}", expected, accepted)]
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::IncorrectCorrectionType,
        )]
        IncorrectCorrectionType {
            expected: EntityType,
            accepted: EntityType,
        },
        #[display("Unexpected error: related entity {entity_name} not found")]
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
            error_code = ErrorCode::IncorrectCorrectionType,
        )]
        UnexpRelatedEntityNotFound {
            entity_name: &'static str
        },
        #[api_error(
            status_code = StatusCode::UNAUTHORIZED,
            error_code = ErrorCode::Unauthorized,
        )]
        Unauthorized
    };
    TokioError = {
        TaskJoin(tokio::task::JoinError)
    };
}

#[derive(Debug, IntoErrorSchema, ApiError, Display, From, Error)]
#[display("Database error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    error_code = ErrorCode::DatabaseError,
    into_response = self,
)]
pub struct DbErrWrapper(DbErr);

impl IntoApiResponse for DbErrWrapper {
    fn into_api_response(self) -> axum::response::Response {
        tracing::error!("Database error: {:#?}", self.0);
        default_into_api_response_impl(self)
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

impl IntoApiResponse for TokioError {
    fn into_api_response(self) -> axum::response::Response {
        tracing::error!("Tokio error: {:#?}", self);
        default_into_api_response_impl(self)
    }
}

impl IntoResponse for TokioError {
    fn into_response(self) -> axum::response::Response {
        self.into_api_response()
    }
}

#[cfg(test)]
mod test {

    use tracing_test::traced_test;

    use super::*;

    // https://github.com/dbrgn/tracing-test/issues/48
    // This bug causes errors with line breaks cannot be captured
    // So I can only test the prefix of errors here
    // If this test fails, it may be because error messages has been changed
    #[tokio::test]
    #[traced_test]
    async fn test_nested_err_print() {
        let err = ServiceError::Database(DbErrWrapper(DbErr::Custom(
            "foobar".to_string(),
        )));

        let _ = err.into_response();

        assert!(logs_contain("Database error: Custom"));

        let err = ServiceError::Tokio(TokioError::TaskJoin(
            async {
                let handle = tokio::spawn(async {
                    panic!("fake panic");
                });

                match handle.await {
                    Err(e) => e,
                    _ => unreachable!(),
                }
            }
            .await,
        ));

        let _ = err.into_response();

        assert!(logs_contain("Tokio error: TaskJoin"));
    }
}
