use std::fmt::Display;

use axum::http::StatusCode;
use macros::ApiError;

use super::ErrorCode;

#[derive(Debug, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
    error_code = ErrorCode::InvalidField
)]
pub struct InvalidField {
    pub field: String,
    pub expected: String,
    pub accepted: String,
}

impl Display for InvalidField {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Invalid field: {}, expected: {}, accepted: {}.",
            self.field, self.expected, self.accepted
        )
    }
}

impl std::error::Error for InvalidField {}
