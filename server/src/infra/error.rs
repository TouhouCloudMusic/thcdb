use std::borrow::Cow;
use std::error::Error as _;
use std::fmt::Debug;

use argon2::password_hash;
use axum::http::StatusCode;
use derive_more::{Display, From};
use macros::{ApiError, IntoErrorSchema};
use sea_orm::DbErr;

use super::database::error::FkViolation;
use crate::presentation::api_response::{
    IntoApiResponse, default_into_api_response_impl,
};

pub type Result<T> = std::result::Result<T, Error>;

/// Note: Don't impl from for variants
#[derive(
    Debug, Display, From, derive_more::Error, ApiError, IntoErrorSchema,
)]
pub enum Error {
    Internal(InternalError),
    User(UserError),
}

impl From<DbErr> for Error {
    fn from(value: DbErr) -> Self {
        Error::Internal(InternalError::SeaOrm(value))
    }
}

impl Error {
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

impl From<password_hash::Error> for Error {
    fn from(value: password_hash::Error) -> Self {
        Error::Internal(InternalError::PasswordHash(value))
    }
}

impl From<std::io::Error> for Error {
    fn from(value: std::io::Error) -> Self {
        Error::Internal(InternalError::Io(value))
    }
}

impl From<tokio::task::JoinError> for Error {
    fn from(value: tokio::task::JoinError) -> Self {
        Error::Internal(InternalError::Tokio(value))
    }
}

#[derive(Debug, Display, derive_more::Error, From, ApiError)]
#[api_error(
    status_code = StatusCode::INTERNAL_SERVER_ERROR,
    into_response = self
)]
#[display("Internal Server Error")]
pub enum InternalError {
    SeaOrm(DbErr),
    Tokio(tokio::task::JoinError),
    Io(std::io::Error),
    PasswordHash(password_hash::Error),
    Custom(#[error(not(source))] Cow<'static, str>),
}

impl InternalError {
    const fn prefix(&self) -> &'static str {
        match self {
            Self::SeaOrm(_) => "Database error",
            Self::Tokio(_) => "Tokio error",
            Self::Io(_) => "IO error",
            Self::PasswordHash(_) => "Password hash error",
            Self::Custom(_) => "Custom error",
        }
    }

    fn print(&self) {
        match self {
            Self::Custom(e) => tracing::error!("{}: {}", self.prefix(), e),
            _ => {
                if let Some(source) = self.source() {
                    tracing::error!("{}: {}", self.prefix(), source);
                } else {
                    tracing::error!("{}: {}", self.prefix(), self);
                }
            }
        }
    }
}

impl IntoApiResponse for InternalError {
    fn into_api_response(self) -> axum::response::Response {
        self.print();
        default_into_api_response_impl(self)
    }
}

#[derive(Debug, Display, derive_more::Error, From, ApiError)]
pub enum UserError {
    FkViolation(FkViolation<DbErr>),
}

pub struct ContextError<E> {
    error: E,
    context: String,
}

impl IntoApiResponse for ContextError<Error> {
    fn into_api_response(self) -> axum::response::Response {
        if let Error::Internal(e) = &self.error {
            let pre = e.prefix();
            tracing::error!(
                "{pre}: {}\n Cause by: {}",
                self.context,
                self.error
            );
        }

        default_into_api_response_impl(self.error)
    }
}

#[cfg(test)]
mod test {

    use axum::response::IntoResponse;
    use tracing_test::traced_test;

    use super::*;
    use crate::presentation::error::ApiError;

    // https://github.com/dbrgn/tracing-test/issues/48
    // This bug causes errors with line breaks cannot be captured
    // So I can only test the prefix of errors here
    // If this test fails, it may be because error messages has been changed
    #[tokio::test]
    #[traced_test]
    async fn test_nested_err_print() {
        let err = Error::from(DbErr::Custom("foobar".to_string()));
        let err = ApiError::Infra(err);

        let _ = err.into_response();

        assert!(logs_contain("Database error: Custom"));
        assert!(logs_contain("foobar"));

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
