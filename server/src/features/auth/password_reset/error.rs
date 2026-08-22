use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError, From};

use crate::features::auth::{InvalidEmail, ValidateCredsError};
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Display, DeriveError, From)]
pub enum ForgotPasswordError {
    #[display("{_0}")]
    #[from]
    InvalidEmail(#[error(source)] InvalidEmail),
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl From<DatabaseError> for ForgotPasswordError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl IntoResponse for ForgotPasswordError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ForgotPasswordError::InvalidEmail(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
            ForgotPasswordError::Internal(source) => source.into_response(),
        }
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum VerifyResetCodeError {
    #[display("{_0}")]
    #[from]
    InvalidEmail(#[error(source)] InvalidEmail),
    #[display("Invalid or expired reset code")]
    InvalidOrExpiredResetCode,
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
}

impl From<DatabaseError> for VerifyResetCodeError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl IntoResponse for VerifyResetCodeError {
    fn into_response(self) -> axum::response::Response {
        match self {
            VerifyResetCodeError::InvalidEmail(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
            VerifyResetCodeError::InvalidOrExpiredResetCode => {
                AppError::bad_request("Invalid or expired reset code")
                    .into_response()
            }
            VerifyResetCodeError::Internal(source) => source.into_response(),
        }
    }
}

#[derive(Debug, Display, DeriveError, From)]
pub enum ResetPasswordError {
    #[display("Invalid or expired reset key")]
    InvalidOrExpiredResetKey,
    #[display("{_0}")]
    #[from]
    Internal(#[error(source)] InternalError),
    #[display("{_0}")]
    #[from]
    Validate(#[error(source)] ValidateCredsError),
}

impl From<DatabaseError> for ResetPasswordError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl IntoResponse for ResetPasswordError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ResetPasswordError::InvalidOrExpiredResetKey => {
                AppError::bad_request("Invalid or expired reset key")
                    .into_response()
            }
            ResetPasswordError::Internal(source) => source.into_response(),
            ResetPasswordError::Validate(source) => {
                AppError::bad_request(source.to_string()).into_response()
            }
        }
    }
}
