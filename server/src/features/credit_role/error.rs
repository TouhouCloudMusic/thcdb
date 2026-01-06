use macros::{ApiError, IntoErrorSchema};

use crate::infra;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum CreateError {
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
    #[snafu(transparent)]
    Infra { source: infra::Error },
}

impl<A> From<A> for CreateError
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum UpsertCorrectionError {
    #[snafu(transparent)]
    Infra { source: infra::Error },
    #[snafu(transparent)]
    Correction {
        source: crate::application::correction::Error,
    },
}

impl<A> From<A> for UpsertCorrectionError
where
    A: Into<infra::Error>,
{
    default fn from(err: A) -> Self {
        Self::Infra { source: err.into() }
    }
}
