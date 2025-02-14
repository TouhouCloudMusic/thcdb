use std::fmt::Display;

use super::{AsErrorCode, ErrorCode};
use crate::api_response::StatusCodeExt;

#[derive(Debug)]
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

impl StatusCodeExt for InvalidField {
    fn as_status_code(&self) -> axum::http::StatusCode {
        axum::http::StatusCode::BAD_REQUEST
    }

    fn all_status_codes() -> impl Iterator<Item = axum::http::StatusCode> {
        [axum::http::StatusCode::BAD_REQUEST].into_iter()
    }
}

impl AsErrorCode for InvalidField {
    fn as_error_code(&self) -> ErrorCode {
        ErrorCode::InvalidField
    }
}
