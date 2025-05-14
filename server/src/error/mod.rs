use std::borrow::Cow;
use std::fmt::Debug;

use argon2::password_hash;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::{Display, From};
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
        #[display("Correction type mismatch, expected: {:#?}, received: {:#?}", expected, received)]
        #[api_error(
            status_code = StatusCode::BAD_REQUEST,
        )]
        IncorrectCorrectionType {
            expected: EntityType,
            received: EntityType,
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

#[derive(Debug, Display, derive_more::Error, From)]
pub enum InfraErrorEnum {
    SeaOrm(DbErr),
    Tokio(tokio::task::JoinError),
    Io(std::io::Error),
    PasswordHash(password_hash::Error),
    Custom(#[error(not(source))] Cow<'static, str>),
}

impl InfraErrorEnum {
    const fn prefix(&self) -> &'static str {
        match self {
            Self::SeaOrm(_) => "Database error",
            Self::Tokio(_) => "Tokio error",
            Self::Io(_) => "IO error",
            Self::PasswordHash(_) => "Password hash error",
            Self::Custom(_) => "Custom error",
        }
    }
}

#[derive(Debug, Display, derive_more::Error, ApiError, IntoErrorSchema)]
#[display("Internal server error")]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self,
)]
pub struct InfraError {
    inner: Box<InfraErrorEnum>,
}

impl InfraError {
    pub fn with_context(
        self,
        context: impl Into<String>,
    ) -> ContextError<Self> {
        ContextError {
            error: self,
            context: context.into(),
        }
    }
}

impl<T> From<T> for InfraError
where
    T: Into<InfraErrorEnum>,
{
    fn from(value: T) -> Self {
        Self {
            inner: Box::new(value.into()),
        }
    }
}

impl IntoApiResponse for InfraError {
    fn into_api_response(self) -> axum::response::Response {
        let pre = self.inner.prefix();
        tracing::error!("{pre}: {}", self.inner);

        default_into_api_response_impl(self)
    }
}

pub struct ContextError<E> {
    error: E,
    context: String,
}

impl IntoApiResponse for ContextError<InfraError> {
    fn into_api_response(self) -> axum::response::Response {
        let pre = self.error.inner.prefix();
        let context = self.context;
        tracing::error!("{pre}: {context}\n Cause by: {}", self.error);
        default_into_api_response_impl(self.error)
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
