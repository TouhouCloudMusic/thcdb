use chrono::{DateTime, FixedOffset};
use entity::enums::{ArtistImageType, ReleaseImageType};
use notification_core::{
    CorrectionModerationAction, ImageQueueModerationAction,
    NotificationCategory,
};
use sea_orm::prelude::Uuid;
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use user_core::UserSummary;
use utoipa::{IntoParams, ToSchema};

#[derive(Clone, Copy, Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct NotificationListQuery {
    #[serde(default)]
    #[param(default = "inbox")]
    pub state: NotificationState,
    pub category: Option<NotificationCategory>,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, ToSchema)]
#[serde(rename_all = "kebab-case")]
pub enum NotificationState {
    #[default]
    Inbox,
    Unread,
    Saved,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct EntityMeta {
    pub kind: NotificationEntityKind,
    pub id: i32,
    pub name: String,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
pub enum NotificationEntityKind {
    Artist,
    Release,
    Song,
    Label,
    Event,
    Tag,
    Correction,
    ImageQueue,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(tag = "state")]
pub enum CollectionReference {
    Available { id: i32, title: String },
    Deleted,
    Restricted,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(tag = "state")]
pub enum CommentPreview {
    Visible {
        id: i32,
        actor: UserSummary,
        content: String,
        created_at: DateTime<FixedOffset>,
    },
    Deleted {
        actor: UserSummary,
        created_at: DateTime<FixedOffset>,
    },
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub enum NotificationImageType {
    Profile,
    Cover,
}

impl From<ArtistImageType> for NotificationImageType {
    fn from(value: ArtistImageType) -> Self {
        match value {
            ArtistImageType::Profile => Self::Profile,
        }
    }
}

impl From<ReleaseImageType> for NotificationImageType {
    fn from(value: ReleaseImageType) -> Self {
        match value {
            ReleaseImageType::Cover => Self::Cover,
        }
    }
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde(tag = "kind")]
pub enum NotificationBody {
    CorrectionReviewRequested {
        actor: UserSummary,
        correction: EntityMeta,
    },

    CorrectionUpdated {
        actor: UserSummary,
        correction: EntityMeta,
    },

    CorrectionModerated {
        actor: UserSummary,
        correction: EntityMeta,
        action: CorrectionModerationAction,
    },

    CommentThreadUpdated {
        container: Option<EntityMeta>,
        #[schema(min_items = 1, max_items = 3)]
        commenters: Vec<UserSummary>,
        #[schema(minimum = 0)]
        additional_commenter_count: i32,
        latest: CommentPreview,
    },

    CommentReplied {
        container: Option<EntityMeta>,
        reply: CommentPreview,
    },

    UserFollowed {
        actor: UserSummary,
    },

    CollectionFollowed {
        actor: UserSummary,
        collection: CollectionReference,
    },

    CollectionItemAdded {
        actor: UserSummary,
        collection: CollectionReference,
    },

    ImageQueueModerated {
        actor: UserSummary,
        image_queue: EntityMeta,
        image_type: NotificationImageType,
        action: ImageQueueModerationAction,
    },

    AccountRoleChanged {
        actor: UserSummary,
        new_roles: Vec<String>,
    },
}

#[derive(Clone, Debug, Serialize, ToSchema)]
pub struct NotificationItem {
    #[schema(value_type = String)]
    pub id: Uuid,
    pub body: NotificationBody,
    pub is_unread: bool,
    pub through_seq: String,
    pub saved_at: Option<DateTime<FixedOffset>>,
    pub created_at: DateTime<FixedOffset>,
    pub last_activity_at: DateTime<FixedOffset>,
}

#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
pub struct UnreadCount {
    pub count: u8,
}

#[derive(
    Clone, Copy, Debug, Deserialize, PartialEq, Eq, Serialize, ToSchema,
)]
#[serde_as]
pub struct NotificationCursor {
    #[serde_as(as = "serde_with::DisplayFromStr")]
    #[schema(value_type = String)]
    pub snapshot_inbox_seq: i64,
    #[serde_as(as = "serde_with::DisplayFromStr")]
    #[schema(value_type = String)]
    pub before_inbox_seq: i64,
}

#[derive(Clone, Debug, Serialize, ToSchema)]
#[serde_as]
pub struct NotificationPage {
    pub items: Vec<NotificationItem>,
    pub next_cursor: Option<NotificationCursor>,
    #[serde_as(as = "serde_with::DisplayFromStr")]
    #[schema(value_type = String)]
    pub snapshot_inbox_seq: i64,
}
