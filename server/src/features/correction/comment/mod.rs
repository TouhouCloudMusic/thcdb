mod error;
mod http;
mod model;
mod repo;
mod service;

#[cfg(all(test, feature = "integration-test"))]
mod tests;

pub(in crate::features::correction) use error::Error;
pub(super) use http::router;
pub(super) use model::CorrectionComment;
use sea_orm::ConnectionTrait;

use crate::domain::shared::{CursorResponse, DEFAULT_LIMIT};

pub(super) async fn initial_page(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<CursorResponse<CorrectionComment>, error::Error> {
    repo::load_comments_page(conn, correction_id, None, DEFAULT_LIMIT).await
}
