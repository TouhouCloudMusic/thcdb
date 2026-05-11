use axum::http::StatusCode;
use axum::response::IntoResponse;
use derive_more::Display;

use crate::domain::auth::ValidateCredsError;
use crate::infra;
use crate::shared::http::api_response;

#[derive(Debug, Display, derive_more::Error)]
#[display("Invalid email: {email}.\n{source}")]
pub struct InvalidEmail {
    email: String,
    source: Box<dyn std::error::Error>,
}

impl InvalidEmail {
    pub fn new(
        email: impl Into<String>,
        source: impl std::error::Error + 'static,
    ) -> Self {
        Self {
            email: email.into(),
            source: Box::new(source),
        }
    }
}

#[derive(Debug, snafu::Snafu)]
#[snafu(visibility(pub(super)))]
pub enum SignUpError {
    #[snafu(display("Username {username} already in use"))]
    UsernameAlreadyInUse { username: String },
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Email service unavailable"))]
    EmailServiceUnavailable,
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Validate { source: ValidateCredsError },
}

impl SignUpError {
    const fn status_code(&self) -> StatusCode {
        match self {
            SignUpError::UsernameAlreadyInUse { .. } => StatusCode::CONFLICT,
            SignUpError::InvalidEmail { .. } => StatusCode::BAD_REQUEST,
            SignUpError::EmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            SignUpError::Infra { source } => source.status_code(),
            SignUpError::Validate { .. } => ValidateCredsError::status_code(),
        }
    }
}

impl<E> From<E> for SignUpError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for SignUpError {
    fn into_response(self) -> axum::response::Response {
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(&self, status_code)
            .into_response()
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum ResendVerificationEmailError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Email service unavailable"))]
    ResendEmailServiceUnavailable,
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl ResendVerificationEmailError {
    const fn status_code(&self) -> StatusCode {
        match self {
            ResendVerificationEmailError::InvalidEmail { .. } => {
                StatusCode::BAD_REQUEST
            }
            ResendVerificationEmailError::ResendEmailServiceUnavailable => {
                StatusCode::SERVICE_UNAVAILABLE
            }
            ResendVerificationEmailError::Infra { source } => {
                source.status_code()
            }
        }
    }
}

impl<E> From<E> for ResendVerificationEmailError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for ResendVerificationEmailError {
    fn into_response(self) -> axum::response::Response {
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(&self, status_code)
            .into_response()
    }
}

#[derive(Debug, snafu::Snafu)]
pub enum VerifyEmailError {
    #[snafu(transparent)]
    InvalidEmail { source: InvalidEmail },
    #[snafu(display("Invalid or expired verification code"))]
    InvalidOrExpiredCode,
    #[snafu(display("Too many attempts, please resend verification code"))]
    TooManyAttempts,
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl VerifyEmailError {
    const fn status_code(&self) -> StatusCode {
        match self {
            VerifyEmailError::InvalidEmail { .. }
            | VerifyEmailError::InvalidOrExpiredCode => StatusCode::BAD_REQUEST,
            VerifyEmailError::TooManyAttempts => StatusCode::TOO_MANY_REQUESTS,
            VerifyEmailError::Infra { source } => source.status_code(),
        }
    }
}

impl<E> From<E> for VerifyEmailError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl IntoResponse for VerifyEmailError {
    fn into_response(self) -> axum::response::Response {
        let status_code = self.status_code();
        api_response::Error::from_err_and_code(&self, status_code)
            .into_response()
    }
}
