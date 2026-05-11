use axum::response::IntoResponse;
use sea_orm::DbErr;

use crate::domain::auth::ValidateCredsError;
use crate::features::auth::InvalidEmail;
use crate::infra;
use crate::infra::database::error::DatabaseError;
use crate::shared::http::api_response::AppError;

#[derive(Debug, snafu::Snafu)]
pub enum ForgotPasswordError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl From<DbErr> for ForgotPasswordError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("forgot password database operation"),
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
        AppError::from(self).into_response()
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
            ForgotPasswordError::Database { source } => source.into(),
            ForgotPasswordError::Infra { source } => source.into(),
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
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl From<DbErr> for VerifyResetCodeError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("verify reset code database operation"),
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
        AppError::from(self).into_response()
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
            VerifyResetCodeError::Database { source } => source.into(),
            VerifyResetCodeError::Infra { source } => source.into(),
        }
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum ResetPasswordError {
    #[snafu(display("Invalid or expired reset key"))]
    InvalidOrExpiredResetKey,
    #[snafu(transparent)]
    Database { source: DatabaseError },
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl From<DbErr> for ResetPasswordError {
    fn from(err: DbErr) -> Self {
        Self::Database {
            source: DatabaseError::new(err)
                .with_operation("reset password database operation"),
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
        AppError::from(self).into_response()
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
            ResetPasswordError::Database { source } => source.into(),
            ResetPasswordError::Infra { source } => source.into(),
            ResetPasswordError::Validate { source } => {
                Self::bad_request(source.to_string())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::body::to_bytes;
    use axum::http::StatusCode;

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
