use std::fmt::Debug;

use macros::{ApiError, IntoErrorSchema};

use crate::infra;

#[derive(Debug, snafu::Snafu, ApiError, IntoErrorSchema)]
pub enum ApiError {
    #[snafu(transparent)]
    #[api_error(
        into_response = source
    )]
    Infra { source: infra::Error },
}
