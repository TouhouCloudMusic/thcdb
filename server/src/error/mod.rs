use std::fmt::Debug;

use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::{Display, Error, From};
use entity::sea_orm_active_enums::EntityType;
use error_set::error_set;
use macros::{ApiError, IntoErrorSchema};
use sea_orm::DbErr;

mod structs;
pub use structs::*;

use crate::api_response::{
    AsStatusCode, IntoApiResponse, default_into_api_response_impl,
};

pub trait ApiErrorTrait = AsStatusCode;

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
        Database(InfraError),
        #[from(tokio::task::JoinError)]
        Tokio(TokioError),
        #[display("Entity {entity_name} not found")]
        #[api_error(
            status_code = StatusCode::NOT_FOUND,
        )]
        EntityNotFound {
            entity_name: &'static str
        },
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
        )]
        InvalidField(InvalidField),
        #[display("Correction type mismatch, expected: {:#?}, accepted: {:#?}", expected, accepted)]
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
        )]
        IncorrectCorrectionType {
            expected: EntityType,
            accepted: EntityType,
        },
        #[display("Unexpected error: related entity {entity_name} not found")]
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
        )]
        UnexpRelatedEntityNotFound {
            entity_name: &'static str
        },
        #[api_error(
            status_code = StatusCode::UNAUTHORIZED,
        )]
        Unauthorized
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

impl AsStatusCode for TokioError {
    fn as_status_code(&self) -> StatusCode {
        StatusCode::INTERNAL_SERVER_ERROR
    }

    fn all_status_codes() -> impl Iterator<Item = StatusCode> {
        [StatusCode::INTERNAL_SERVER_ERROR].into_iter()
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

#[derive(Debug, Display, From, Error)]
enum InfraErrorEnum {
    SeaOrm(DbErr),
    Tokio(tokio::task::JoinError),
    Io(std::io::Error),
}

#[derive(Debug, Display, Error, ApiError, IntoErrorSchema)]
#[display("Internal server error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self,
)]
pub struct InfraError(InfraErrorEnum);

impl<T> From<T> for InfraError
where
    T: Into<InfraErrorEnum>,
{
    fn from(value: T) -> Self {
        Self(value.into())
    }
}

impl IntoApiResponse for InfraError {
    fn into_api_response(self) -> axum::response::Response {
        match &self.0 {
            InfraErrorEnum::SeaOrm(err) => {
                tracing::error!("Database error: {:#?}", err);
            }
            InfraErrorEnum::Tokio(err) => {
                tracing::error!("Tokio error: {:#?}", err);
            }
            InfraErrorEnum::Io(err) => {
                tracing::error!("IO error: {:#?}", err);
            }
        }

        default_into_api_response_impl(self)
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
        let err = ServiceError::Database(InfraError::from(DbErr::Custom(
            "foobar".to_string(),
        )));

        let _ = err.into_response();

        assert!(logs_contain("Database error: Custom"));

        // cranelift dosen't support catch_unwind yet
        // let err = ServiceError::Tokio(TokioError::TaskJoin(
        //     async {
        //         let handle = tokio::spawn(async {
        //             panic!("fake panic");
        //         });

        //         match handle.await {
        //             Err(e) => e,
        //             _ => unreachable!(),
        //         }
        //     }
        //     .await,
        // ));

        // let _ = err.into_response();

        // assert!(logs_contain("Tokio error: TaskJoin"));
    }
}
