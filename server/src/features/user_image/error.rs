use macros::{ApiError, IntoErrorSchema};

use crate::domain::image::{
    ValidationError, {self},
};

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum Error {
    #[snafu(transparent)]
    Infra { source: crate::infra::Error },
    #[snafu(transparent)]
    ImageService { source: image::Error },
    #[snafu(transparent)]
    Validate { source: ValidationError },
}

impl<E> From<E> for Error
where
    E: Into<crate::infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}
