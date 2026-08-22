use chrono::{DateTime, FixedOffset};
use entity::enums::CommentState as DbCommentState;
use serde::Serialize;
use utoipa::ToSchema;

use crate::{CommentTargetKind, Error};

pub const COMMENT_CONTENT_MAX_LEN: usize = 5000;

#[derive(Debug)]
pub struct CreateCommentCommand {
    pub target_kind: CommentTargetKind,
    pub target_id: i32,
    pub author_id: i32,
    pub in_reply_to_comment_id: Option<i32>,
    pub content: String,
    pub read_through_comment_id: Option<i32>,
}

pub(super) struct ValidatedCreateCommentCommand(CreateCommentCommand);

impl CreateCommentCommand {
    pub(super) fn validate(
        self,
    ) -> Result<ValidatedCreateCommentCommand, Error> {
        if self.content.trim().is_empty() {
            return Err(Error::invalid_request(
                "Comment content must not be empty",
            ));
        }

        if self.content.chars().count() > COMMENT_CONTENT_MAX_LEN {
            return Err(Error::invalid_request("Comment content is too long"));
        }

        Ok(ValidatedCreateCommentCommand(self))
    }
}

impl ValidatedCreateCommentCommand {
    pub(super) fn into_inner(self) -> CreateCommentCommand {
        self.0
    }
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub enum CommentState {
    Active,
    Deleted,
}

impl From<DbCommentState> for CommentState {
    fn from(value: DbCommentState) -> Self {
        match value {
            DbCommentState::Visable => Self::Active,
            DbCommentState::InReview
            | DbCommentState::Hidden
            | DbCommentState::Deleted => Self::Deleted,
        }
    }
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub struct CommentAuthor {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub struct Comment {
    pub id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub in_reply_to_comment_id: Option<i32>,
    pub author: CommentAuthor,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub state: CommentState,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

impl From<comment_repo::CommentRecord> for Comment {
    fn from(value: comment_repo::CommentRecord) -> Self {
        let comment_repo::CommentRecord {
            id,
            in_reply_to_comment_id,
            author_id,
            author_name,
            avatar,
            content,
            state,
            created_at,
            updated_at,
        } = value;
        let state = CommentState::from(state);
        let content = (state == CommentState::Active).then_some(content);
        let avatar_url = avatar.map(|avatar| avatar.url());

        Self {
            id,
            in_reply_to_comment_id,
            author: CommentAuthor {
                id: author_id,
                name: author_name,
                avatar_url,
            },
            content,
            state,
            created_at,
            updated_at,
        }
    }
}

#[derive(Default, Serialize, ToSchema)]
pub struct CommentPage {
    pub items: Vec<Comment>,
    pub next_cursor: Option<i32>,
    pub active_count: u64,
}

impl From<comment_repo::CommentRecordPage> for CommentPage {
    fn from(value: comment_repo::CommentRecordPage) -> Self {
        Self {
            items: value.items.into_iter().map(Into::into).collect(),
            next_cursor: value.next_cursor,
            active_count: value.active_count,
        }
    }
}
