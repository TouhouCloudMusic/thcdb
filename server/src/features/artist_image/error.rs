use macros::{ApiError, IntoErrorSchema};
use snafu::Snafu;

use crate::domain::image;
use crate::infra;

#[derive(Debug, Snafu, ApiError, IntoErrorSchema)]
pub enum Error {
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Service { source: image::Error },
}

impl<A> From<A> for Error
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}
