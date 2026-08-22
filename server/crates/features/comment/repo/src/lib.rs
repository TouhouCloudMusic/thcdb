mod comment_target;
mod create;
mod delete;
mod query;

pub use comment_target::{CommentTarget, CommentTargetKind};
pub use create::{CommentThread, CreateCommentError, CreatedComment};
pub use delete::soft_delete_comment;
pub use query::{
    CommentRecord, CommentRecordPage, find_comment, find_comment_in_thread,
    load_comment, load_thread_targets, load_visible_comment_ids,
};
