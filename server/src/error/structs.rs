use axum::http::StatusCode;
use derive_more::{Display, Error};
use macros::ApiError;

#[derive(Debug, Display, Error, ApiError)]
#[api_error(
    status_code = StatusCode::BAD_REQUEST,
)]
#[display(
    "Invalid field: {field}, expected: {expected}, received: {received}."
)]
pub struct InvalidField {
    pub field: String,
    pub expected: String,
    pub received: String,
}
