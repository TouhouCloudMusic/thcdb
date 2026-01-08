mod pagination;
mod sorting;

use axum::http::StatusCode;
use axum::response::IntoResponse;
pub use pagination::PaginationQuery;
use snafu::Report;
pub use sorting::{CorrectionSortField, SortDirection, apply_sort_defaults};

use crate::adapter::inbound::rest::api_response;

#[derive(Debug)]
pub struct Error<E: snafu::Error> {
    source: E,
    status_code: StatusCode,
}

impl<E> Error<E>
where
    E: snafu::Error,
{
    pub const fn bad_request(err: E) -> Self {
        Self {
            source: err,
            status_code: StatusCode::BAD_REQUEST,
        }
    }
}

impl<E> std::fmt::Display for Error<E>
where
    E: snafu::Error,
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let rp = Report::from_error(&self.source);
        write!(f, "{rp}")
    }
}

impl<E> IntoResponse for Error<E>
where
    E: snafu::Error,
{
    fn into_response(self) -> axum::response::Response {
        tracing::error!("{}", self.source);
        let msg = self.source.to_string();
        api_response::Error::from_err_and_code(msg, self.status_code)
            .into_response()
    }
}
