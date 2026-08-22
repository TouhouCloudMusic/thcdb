use domain::shared::MessageError;
use infra_db::error::DatabaseError;

use crate::CommentTargetKind;

type BoxedError = Box<dyn std::error::Error + Send + Sync + 'static>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorKind {
    InvalidRequest,
    NotFound,
    PermissionDenied,
    Internal,
}

#[derive(Debug, derive_more::Display, derive_more::Error)]
#[display("{source}")]
pub struct Error {
    kind: ErrorKind,
    #[error(source)]
    source: BoxedError,
}

impl Error {
    pub const fn kind(&self) -> ErrorKind {
        self.kind
    }

    fn message(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            source: Box::new(MessageError::new(message)),
        }
    }

    pub(crate) fn invalid_request(message: &'static str) -> Self {
        Self::message(ErrorKind::InvalidRequest, message)
    }

    pub(crate) fn target_not_found(target: CommentTargetKind) -> Self {
        Self::message(
            ErrorKind::NotFound,
            format!("{} not found", target.entity_name()),
        )
    }

    pub(crate) fn comment_not_found() -> Self {
        Self::message(ErrorKind::NotFound, "Comment not found")
    }

    pub(crate) fn permission_denied() -> Self {
        Self::message(ErrorKind::PermissionDenied, "Permission denied")
    }

    fn internal(
        source: impl std::error::Error + Send + Sync + 'static,
    ) -> Self {
        Self {
            kind: ErrorKind::Internal,
            source: Box::new(source),
        }
    }
}

impl From<DatabaseError> for Error {
    fn from(source: DatabaseError) -> Self {
        Self::internal(source)
    }
}

impl From<comment_repo::CreateCommentError> for Error {
    fn from(source: comment_repo::CreateCommentError) -> Self {
        match source {
            comment_repo::CreateCommentError::InvalidInReplyToComment => {
                Self::invalid_request(
                    "Replied-to comment is not active in this thread",
                )
            }
            comment_repo::CreateCommentError::Database(source) => {
                Self::internal(source)
            }
        }
    }
}
