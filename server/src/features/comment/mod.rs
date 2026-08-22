mod error;
mod http;

pub(crate) use comment_service::{CommentPage, CommentTargetKind, Service};
pub(crate) use http::EntityCommentTarget;
pub use http::router;
