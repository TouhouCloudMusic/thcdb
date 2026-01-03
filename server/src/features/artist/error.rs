use macros::{ApiError, IntoErrorSchema};

use crate::features::artist::model::ValidationError;
use crate::infra;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[snafu(transparent)]
    Validation { source: ValidationError },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Validation { source: ValidationError },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl<E> From<E> for CreateError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}

impl<E> From<E> for UpsertCorrectionError
where
    E: Into<infra::Error>,
{
    default fn from(err: E) -> Self {
        Self::Infra { source: err.into() }
    }
}
