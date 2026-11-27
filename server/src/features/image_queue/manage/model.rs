use entity::sea_orm_active_enums::ImageQueueStatus;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use super::ImageQueueType;
use crate::features::image_queue::shared::{ImageQueueListTarget, UserSummary};

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub(crate) struct ImageQueueFilterQuery {
    pub(crate) r#type: Option<ImageQueueType>,
    pub(crate) status: Option<ImageQueueStatus>,
}

#[derive(Deserialize, ToSchema)]
pub(crate) enum ImageQueueAction {
    Approve,
    Reject,
    Revert,
}

#[derive(IntoParams, Deserialize)]
pub(crate) struct ImageQueueModerationQuery {
    pub(crate) action: ImageQueueAction,
}

#[derive(Serialize, ToSchema)]
pub(crate) struct PendingImageQueueItem {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    created_by: UserSummary,
    image_url: Option<String>,
    target: Option<ImageQueueListTarget>,
}

impl PendingImageQueueItem {
    pub(crate) const fn new(
        &entity::image_queue::Model {
            id,
            image_id,
            status,
            created_at,
            ..
        }: &entity::image_queue::Model,
        created_by: UserSummary,
        image_url: Option<String>,
        target: Option<ImageQueueListTarget>,
    ) -> Self {
        Self {
            id,
            image_id,
            status,
            created_at,
            created_by,
            image_url,
            target,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ImageSummary {
    id: i32,
    url: String,
    uploaded_at: chrono::DateTime<chrono::FixedOffset>,
    uploaded_by: UserSummary,
}

impl ImageSummary {
    pub(crate) fn new(
        entity::image::Model {
            id,
            object_key,
            uploaded_at,
            ..
        }: entity::image::Model,
        uploaded_by: UserSummary,
    ) -> Self {
        Self {
            id,
            url: object_key,
            uploaded_at,
            uploaded_by,
        }
    }
}

#[derive(Serialize, ToSchema)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub(crate) enum ImageQueueTarget {
    Artist {
        id: i32,
        name: String,
        #[schema(required = true)]
        current_image_url: Option<String>,
    },
    Release {
        id: i32,
        name: String,
        #[schema(required = true)]
        current_image_url: Option<String>,
    },
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ImageQueueDetail {
    pub(crate) id: i32,
    pub(crate) previous_id: Option<i32>,
    pub(crate) next_id: Option<i32>,
    pub(crate) image_id: Option<i32>,
    pub(crate) status: ImageQueueStatus,
    pub(crate) created_at: chrono::DateTime<chrono::FixedOffset>,
    pub(crate) created_by: UserSummary,
    pub(crate) description: Option<String>,
    pub(crate) handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub(crate) handled_by: Option<UserSummary>,
    pub(crate) reverted_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    pub(crate) reverted_by: Option<UserSummary>,
    pub(crate) image: Option<ImageSummary>,
    pub(crate) target: ImageQueueTarget,
    pub(crate) is_subscribed: bool,
}
