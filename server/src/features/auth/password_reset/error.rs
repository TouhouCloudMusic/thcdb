use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError, From};

use crate::domain::auth::ValidateCredsError;
use crate::features::auth::InvalidEmail;
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

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;
    use axum::http::StatusCode;
    use axum::response::IntoResponse;

    use super::*;
    use crate::shared::error::MessageError;

    async fn response_body_string(
        response: axum::response::Response,
    ) -> String {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn forgot_password_internal_error_is_opaque_to_clients() {
        let response = ForgotPasswordError::Internal(InternalError::new(
            MessageError::new("forgot-password secret"),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("forgot-password secret"));
    }

    #[tokio::test]
    async fn verify_reset_code_internal_error_is_opaque_to_clients() {
        let response = VerifyResetCodeError::Internal(InternalError::new(
            MessageError::new("verify-reset-code secret"),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("verify-reset-code secret"));
    }

    #[tokio::test]
    async fn reset_password_internal_error_is_opaque_to_clients() {
        let response = ResetPasswordError::Internal(InternalError::new(
            MessageError::new("reset-password secret"),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("reset-password secret"));
    }
}
