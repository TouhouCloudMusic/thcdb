use comment_service::CommentTargetKind;
use serde::Deserialize;
use utoipa::ToSchema;

#[derive(Debug, Deserialize, ToSchema)]
pub(super) struct CreateEntityCommentRequest {
    pub in_reply_to_comment_id: Option<i32>,
    pub content: String,
    pub read_through_comment_id: Option<i32>,
}

#[derive(Clone, Copy, Debug, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum EntityCommentTarget {
    Artist,
    Release,
    Song,
    Label,
    Event,
    Tag,
    Correction,
    ImageQueue,
}

impl From<EntityCommentTarget> for CommentTargetKind {
    fn from(value: EntityCommentTarget) -> Self {
        match value {
            EntityCommentTarget::Artist => Self::Artist,
            EntityCommentTarget::Release => Self::Release,
            EntityCommentTarget::Song => Self::Song,
            EntityCommentTarget::Label => Self::Label,
            EntityCommentTarget::Event => Self::Event,
            EntityCommentTarget::Tag => Self::Tag,
            EntityCommentTarget::Correction => Self::Correction,
            EntityCommentTarget::ImageQueue => Self::ImageQueue,
        }
    }
}
