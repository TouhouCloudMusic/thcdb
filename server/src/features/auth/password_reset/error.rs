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

impl From<ForgotPasswordError> for AppError {
    #[track_caller]
    fn from(err: ForgotPasswordError) -> Self {
        let message = err.to_string();
        match err {
            ForgotPasswordError::InvalidEmail(_) => Self::bad_request(message),
            ForgotPasswordError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for ForgotPasswordError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
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

impl From<VerifyResetCodeError> for AppError {
    #[track_caller]
    fn from(err: VerifyResetCodeError) -> Self {
        let message = err.to_string();
        match err {
            VerifyResetCodeError::InvalidEmail(_)
            | VerifyResetCodeError::InvalidOrExpiredResetCode => {
                Self::bad_request(message)
            }
            VerifyResetCodeError::Internal(source) => source.into(),
        }
    }
}

impl IntoResponse for VerifyResetCodeError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
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

impl From<ResetPasswordError> for AppError {
    #[track_caller]
    fn from(err: ResetPasswordError) -> Self {
        let message = err.to_string();
        match err {
            ResetPasswordError::InvalidOrExpiredResetKey => {
                Self::bad_request(message)
            }
            ResetPasswordError::Internal(source) => source.into(),
            ResetPasswordError::Validate(source) => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

impl IntoResponse for ResetPasswordError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
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
        let response = AppError::from(ForgotPasswordError::Internal(
            InternalError::new(MessageError::new("forgot-password secret")),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("forgot-password secret"));
    }

    #[tokio::test]
    async fn verify_reset_code_internal_error_is_opaque_to_clients() {
        let response = AppError::from(VerifyResetCodeError::Internal(
            InternalError::new(MessageError::new("verify-reset-code secret")),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("verify-reset-code secret"));
    }

    #[tokio::test]
    async fn reset_password_internal_error_is_opaque_to_clients() {
        let response = AppError::from(ResetPasswordError::Internal(
            InternalError::new(MessageError::new("reset-password secret")),
        ))
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("reset-password secret"));
    }
}
