mod http;
mod repo;

pub use http::router;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub(crate) struct SearchResult<T> {
    pub item: T,
    pub matched_name: Option<String>,
}
