mod error;
mod http;
mod model;
mod repo;
mod service;

#[cfg(all(test, feature = "integration-test"))]
mod tests;

pub(crate) use error::Error;
pub(crate) use http::EntityCommentTarget;
pub use http::router;
use model::EntityComment;
pub(crate) use model::{
    CommentTarget, CorrectionComment, CreateEntityCommentRequest,
};
use sea_orm::ConnectionTrait;
pub(crate) use service::Service;

use crate::domain::shared::{Cursor, CursorResponse};

pub(crate) async fn initial_page(
    conn: &impl ConnectionTrait,
    target: CommentTarget,
    target_id: i32,
    limit: u8,
) -> Result<CursorResponse<EntityComment>, Error> {
    repo::load_target_comments_page(
        conn,
        target,
        target_id,
        Cursor { at: 0, limit },
    )
    .await
    .map(CursorResponse::from)
}
