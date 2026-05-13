use axum::response::IntoResponse;
use derive_more::{Display, Error as DeriveError};

use crate::domain::auth::ValidateCredsError;
use crate::features::auth::InvalidEmail;
use crate::infra::database::error::DatabaseError;
use crate::shared::error::InternalError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, Display, DeriveError)]
pub enum ForgotPasswordError {
    #[display("{source}")]
    InvalidEmail {
        #[error(source)]
        source: InvalidEmail,
    },
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
}

impl From<InvalidEmail> for ForgotPasswordError {
    fn from(source: InvalidEmail) -> Self {
        Self::InvalidEmail { source }
    }
}

impl From<DatabaseError> for ForgotPasswordError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<InternalError> for ForgotPasswordError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
    }
}

impl From<ForgotPasswordError> for AppError {
    #[track_caller]
    fn from(err: ForgotPasswordError) -> Self {
        let message = err.to_string();
        match err {
            ForgotPasswordError::InvalidEmail { .. } => {
                Self::bad_request(message)
            }
            ForgotPasswordError::Internal { source } => source.into(),
        }
    }
}

impl IntoResponse for ForgotPasswordError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Display, DeriveError)]
pub enum VerifyResetCodeError {
    #[display("{source}")]
    InvalidEmail {
        #[error(source)]
        source: InvalidEmail,
    },
    #[display("Invalid or expired reset code")]
    InvalidOrExpiredResetCode,
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
}

impl From<InvalidEmail> for VerifyResetCodeError {
    fn from(source: InvalidEmail) -> Self {
        Self::InvalidEmail { source }
    }
}

impl From<DatabaseError> for VerifyResetCodeError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<InternalError> for VerifyResetCodeError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
    }
}

impl From<VerifyResetCodeError> for AppError {
    #[track_caller]
    fn from(err: VerifyResetCodeError) -> Self {
        let message = err.to_string();
        match err {
            VerifyResetCodeError::InvalidEmail { .. }
            | VerifyResetCodeError::InvalidOrExpiredResetCode => {
                Self::bad_request(message)
            }
            VerifyResetCodeError::Internal { source } => source.into(),
        }
    }
}

impl IntoResponse for VerifyResetCodeError {
    fn into_response(self) -> axum::response::Response {
        AppError::from(self).into_response()
    }
}

#[derive(Debug, Display, DeriveError)]
pub enum ResetPasswordError {
    #[display("Invalid or expired reset key")]
    InvalidOrExpiredResetKey,
    #[display("{source}")]
    Internal {
        #[error(source)]
        source: InternalError,
    },
    #[display("{source}")]
    Validate {
        #[error(source)]
        source: ValidateCredsError,
    },
}

impl From<DatabaseError> for ResetPasswordError {
    fn from(source: DatabaseError) -> Self {
        InternalError::new(source).into()
    }
}

impl From<ValidateCredsError> for ResetPasswordError {
    fn from(source: ValidateCredsError) -> Self {
        Self::Validate { source }
    }
}

impl From<InternalError> for ResetPasswordError {
    fn from(source: InternalError) -> Self {
        Self::Internal { source }
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
            ResetPasswordError::Internal { source } => source.into(),
            ResetPasswordError::Validate { source } => {
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
        let response = AppError::from(ForgotPasswordError::Internal {
            source: InternalError::new(MessageError::new(
                "forgot-password secret",
            )),
        })
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("forgot-password secret"));
    }

    #[tokio::test]
    async fn verify_reset_code_internal_error_is_opaque_to_clients() {
        let response = AppError::from(VerifyResetCodeError::Internal {
            source: InternalError::new(MessageError::new(
                "verify-reset-code secret",
            )),
        })
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("verify-reset-code secret"));
    }

    #[tokio::test]
    async fn reset_password_internal_error_is_opaque_to_clients() {
        let response = AppError::from(ResetPasswordError::Internal {
            source: InternalError::new(MessageError::new(
                "reset-password secret",
            )),
        })
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("reset-password secret"));
    }
}
