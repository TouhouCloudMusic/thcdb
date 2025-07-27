use std::fmt::Debug;

use macros::{ApiError, IntoErrorSchema};

use crate::infra;

#[derive(Debug, thiserror::Error, ApiError, IntoErrorSchema)]
pub enum ApiError {
    #[error(transparent)]
    Infra(
        #[from]
        #[backtrace]
        infra::Error,
    ),
}
