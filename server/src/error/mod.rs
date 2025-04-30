use std::fmt::Debug;

use argon2::password_hash;
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
    #[disable(From(InfraError))]
    #[derive(IntoErrorSchema, From, ApiError)]
    ServiceError = {
        #[from(forward)]
        Infra(InfraError),
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
}

impl IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        match self {
            Self::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
        }
    }
}

#[derive(Debug, Display, From, Error)]
enum InfraErrorEnum {
    SeaOrm(DbErr),
    Tokio(tokio::task::JoinError),
    Io(std::io::Error),
    PasswordHash(password_hash::Error),
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
                tracing::error!("Database error: {err}");
            }
            InfraErrorEnum::Tokio(err) => {
                tracing::error!("Tokio error: {err}");
            }
            InfraErrorEnum::Io(err) => {
                tracing::error!("IO error: {err}");
            }
            InfraErrorEnum::PasswordHash(err) => {
                tracing::error!("Password hash error: {err}");
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
        let err = ServiceError::Infra(InfraError::from(DbErr::Custom(
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
