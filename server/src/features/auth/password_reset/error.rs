use std::panic::Location;

use axum::http::StatusCode;
use axum::response::IntoResponse;

use crate::domain::auth::ValidateCredsError;
use crate::features::auth::InvalidEmail;
use crate::infra;
use crate::shared::http::api_response::{self, ApiError as _};

const INTERNAL_ERROR_MESSAGE: &str = "Internal server error";

#[track_caller]
fn opaque_internal_error_response(
    source: &(dyn std::error::Error + Send + Sync),
    operation: &'static str,
) -> axum::response::Response {
    log::error!(
        target: "features.auth.password_reset.error",
        location:% = Location::caller(),
        operation = operation,
        source:? = source;
        "Password reset auth flow failed with internal error"
    );
    api_response::Error::from_err_and_code(
        INTERNAL_ERROR_MESSAGE,
        StatusCode::INTERNAL_SERVER_ERROR,
    )
    .into_response()
}

#[derive(Debug, snafu::Snafu)]
pub enum ForgotPasswordError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl ForgotPasswordError {
    fn status_code(&self) -> StatusCode {
        match self {
            ForgotPasswordError::InvalidEmail { .. } => StatusCode::BAD_REQUEST,
            ForgotPasswordError::Infra { source } => source.as_status_code(),
        }
    }
}

impl<E> From<E> for ForgotPasswordError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for ForgotPasswordError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ForgotPasswordError::Infra {
                source: infra::Error::Internal { source },
            } => opaque_internal_error_response(
                source.as_ref(),
                "forgot_password",
            ),
            err => {
                let status_code = err.status_code();
                api_response::Error::from_err_and_code(err, status_code)
                    .into_response()
            }
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum VerifyResetCodeError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Invalid or expired reset code"))]
    InvalidOrExpiredResetCode,
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl VerifyResetCodeError {
    fn status_code(&self) -> StatusCode {
        match self {
            VerifyResetCodeError::InvalidEmail { .. }
            | VerifyResetCodeError::InvalidOrExpiredResetCode => {
                StatusCode::BAD_REQUEST
            }
            VerifyResetCodeError::Infra { source } => source.as_status_code(),
        }
    }
}

impl<E> From<E> for VerifyResetCodeError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for VerifyResetCodeError {
    fn into_response(self) -> axum::response::Response {
        match self {
            VerifyResetCodeError::Infra {
                source: infra::Error::Internal { source },
            } => opaque_internal_error_response(
                source.as_ref(),
                "verify_reset_code",
            ),
            err => {
                let status_code = err.status_code();
                api_response::Error::from_err_and_code(err, status_code)
                    .into_response()
            }
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum ResetPasswordError {
    #[snafu(display("Invalid or expired reset key"))]
    InvalidOrExpiredResetKey,
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl ResetPasswordError {
    fn status_code(&self) -> StatusCode {
        match self {
            ResetPasswordError::InvalidOrExpiredResetKey => {
                StatusCode::BAD_REQUEST
            }
            ResetPasswordError::Infra { source } => source.as_status_code(),
            ResetPasswordError::Validate { source } => source.as_status_code(),
        }
    }
}

impl<E> From<E> for ResetPasswordError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for ResetPasswordError {
    fn into_response(self) -> axum::response::Response {
        match self {
            ResetPasswordError::Infra {
                source: infra::Error::Internal { source },
            } => opaque_internal_error_response(
                source.as_ref(),
                "reset_password",
            ),
            err => {
                let status_code = err.status_code();
                api_response::Error::from_err_and_code(err, status_code)
                    .into_response()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;

    use super::*;

    async fn response_body_string(
        response: axum::response::Response,
    ) -> String {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn forgot_password_internal_error_is_opaque_to_clients() {
        let response = ForgotPasswordError::Infra {
            source: infra::Error::custom(&"forgot-password secret"),
        }
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("forgot-password secret"));
    }

    #[tokio::test]
    async fn verify_reset_code_internal_error_is_opaque_to_clients() {
        let response = VerifyResetCodeError::Infra {
            source: infra::Error::custom(&"verify-reset-code secret"),
        }
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("verify-reset-code secret"));
    }

    #[tokio::test]
    async fn reset_password_internal_error_is_opaque_to_clients() {
        let response = ResetPasswordError::Infra {
            source: infra::Error::custom(&"reset-password secret"),
        }
        .into_response();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response_body_string(response).await;
        assert!(body.contains(r#""message":"Internal server error""#));
        assert!(!body.contains("reset-password secret"));
    }
}
