use axum::http::StatusCode;
use macros::{ApiError, IntoErrorSchema};

use crate::infra;

mod model;
pub use model::*;

use super::error::Unauthorized;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum Error {
    #[snafu(display("Correction already approved"))]
    #[api_error(
        status_code = StatusCode::CONFLICT,
    )]
    AlreadyApproved,
    #[snafu(display("Correction not found"))]
    #[api_error(
        status_code = StatusCode::NOT_FOUND,
    )]
    NotFound,
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Unauthorized { source: Unauthorized },
}

impl<A> From<A> for Error
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}
