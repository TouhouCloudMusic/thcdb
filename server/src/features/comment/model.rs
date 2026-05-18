use chrono::{DateTime, FixedOffset};
use domain::image::Image;
use domain::shared::CursorResponse;
use entity::enums::CommentState as DbCommentState;
use entity::{
    comment as comment_entity, image as image_entity, user as user_entity,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub(crate) const COMMENT_CONTENT_MAX_LEN: usize = 5000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, strum::EnumIter)]
pub(crate) enum CommentTarget {
    Artist,
    Release,
    Song,
    Label,
    Event,
    Tag,
    Correction,
}

impl CommentTarget {
    pub(crate) const fn not_found_message(self) -> &'static str {
        match self {
            Self::Artist => "Artist not found",
            Self::Release => "Release not found",
            Self::Song => "Song not found",
            Self::Label => "Label not found",
            Self::Event => "Event not found",
            Self::Tag => "Tag not found",
            Self::Correction => "Correction not found",
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub(crate) enum CommentState {
    Active,
    Deleted,
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub(crate) struct CommentAuthor {
    pub id: i32,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub(crate) struct EntityComment {
    pub id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<i32>,
    pub author: CommentAuthor,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub state: CommentState,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

impl EntityComment {
    pub(super) fn from_models(
        comment_entity::Model {
            id,
            content,
            state: db_state,
            parent_id,
            created_at,
            updated_at,
            ..
        }: comment_entity::Model,
        user_entity::Model {
            id: author_id,
            name,
            ..
        }: user_entity::Model,
        avatar: Option<&image_entity::Model>,
    ) -> Self {
        let state = if matches!(db_state, DbCommentState::Visable) {
            CommentState::Active
        } else {
            CommentState::Deleted
        };
        let avatar_url = avatar.map(
            |image_entity::Model {
                 backend,
                 directory,
                 filename,
                 ..
             }| Image::format_url(*backend, directory, filename),
        );

        Self {
            id,
            parent_id,
            author: CommentAuthor {
                id: author_id,
                name,
                avatar_url,
            },
            content: (state == CommentState::Active).then_some(content),
            state,
            created_at,
            updated_at,
        }
    }
}

#[derive(Default, Serialize, ToSchema)]
pub(crate) struct EntityCommentPage {
    pub items: Vec<EntityComment>,
    pub next_cursor: Option<i32>,
    pub active_count: u64,
}

impl From<EntityCommentPage> for CursorResponse<EntityComment> {
    fn from(value: EntityCommentPage) -> Self {
        CursorResponse {
            items: value.items,
            next_cursor: value.next_cursor,
        }
    }
}

#[derive(Clone, Debug, Serialize, ToSchema, PartialEq, Eq)]
pub(crate) struct CorrectionComment {
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
    pub(crate) fn from_entity(
        correction_id: i32,
        EntityComment {
            id,
            parent_id,
            author,
            content,
            state,
            created_at,
            updated_at,
        }: EntityComment,
    ) -> Self {
        Self {
            id,
            correction_id,
            parent_id,
            author,
            content,
            state,
            created_at,
            updated_at,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub(crate) struct CreateEntityCommentRequest {
    pub parent_id: Option<i32>,
    pub content: String,
}

impl CreateEntityCommentRequest {
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
