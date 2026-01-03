use axum::http::StatusCode;
use macros::{ApiError, IntoErrorSchema};
use snafu::Snafu;

use crate::application::error::EntityNotFound;
use crate::domain::image;
use crate::infra;

#[derive(Debug, Snafu, ApiError, IntoErrorSchema)]
pub enum Error {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    Service { source: image::Error },
    #[api_error(
        status_code = StatusCode::BAD_REQUEST,
        into_response = self
    )]
    #[snafu(transparent)]
    ReleaseNotFound { source: EntityNotFound },
}

impl<T> From<T> for Error
where
    T: Into<infra::Error>,
{
    default fn from(value: T) -> Self {
        Self::Infra {
            source: value.into(),
        }
    }
}
