use macros::{ApiError, IntoErrorSchema};

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
#[snafu(module)]
pub enum CreateError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(display("Validation error: {message}"))]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation { message: String },
}

impl<E> From<E> for CreateError
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
#[snafu(module)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(display("Validation error: {message}"))]
    #[api_error(status_code = axum::http::StatusCode::BAD_REQUEST)]
    Validation { message: String },
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}
