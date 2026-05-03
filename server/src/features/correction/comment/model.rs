use chrono::{DateTime, FixedOffset};
use entity::enums::CommentState as DbCommentState;
use entity::{comment as comment_entity, user as user_entity};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub(super) const COMMENT_CONTENT_MAX_LEN: usize = 5000;

#[derive(Clone, Copy, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub enum CommentState {
    Active,
    Deleted,
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub struct CommentAuthor {
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub struct CorrectionComment {
    pub id: i32,
    pub correction_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<i32>,
    pub author: CommentAuthor,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub state: CommentState,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

impl CorrectionComment {
    pub(super) fn from_models(
        comment: comment_entity::Model,
        author: user_entity::Model,
    ) -> Self {
        let is_active = matches!(comment.state, DbCommentState::Visable);
        Self {
            id: comment.id,
            correction_id: comment.target_id,
            parent_id: comment.parent_id,
            author: CommentAuthor {
                id: author.id,
                name: author.name,
            },
            content: is_active.then_some(comment.content),
            state: if is_active {
                CommentState::Active
            } else {
                CommentState::Deleted
            },
            created_at: comment.created_at,
            updated_at: comment.updated_at,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateCorrectionCommentRequest {
    pub parent_id: Option<i32>,
    pub content: String,
}

impl CreateCorrectionCommentRequest {
    pub(super) fn validate(&self) -> Result<(), String> {
        if self.content.trim().is_empty() {
            return Err("Comment content must not be empty".to_string());
        }

        if self.content.chars().count() > COMMENT_CONTENT_MAX_LEN {
            return Err("Comment content is too long".to_string());
        }

        Ok(())
    }
}
