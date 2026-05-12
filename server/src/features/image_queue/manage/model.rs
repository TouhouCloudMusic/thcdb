use entity::sea_orm_active_enums::{
    ArtistImageType, ImageQueueStatus, ReleaseImageType,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use super::ImageQueueType;
use crate::features::image_queue::shared::UserSummary;

#[derive(Debug, Clone, Deserialize, IntoParams)]
pub(crate) struct ImageQueueFilterQuery {
    pub(crate) r#type: Option<ImageQueueType>,
    pub(crate) status: Option<ImageQueueStatus>,
}

#[derive(Deserialize, ToSchema)]
pub(crate) enum HandleImageQueueMethod {
    Approve,
    Reject,
    Revert,
}

#[derive(IntoParams, Deserialize)]
pub(crate) struct HandleImageQueueQuery {
    pub(crate) method: HandleImageQueueMethod,
}

#[derive(Serialize, ToSchema)]
pub(crate) struct PendingImageQueueItem {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    created_by: UserSummary,
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
    ) -> Self {
        Self {
            id,
            image_id,
            status,
            created_at,
            created_by,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ImageSummary {
    id: i32,
    filename: String,
    directory: String,
    uploaded_at: chrono::DateTime<chrono::FixedOffset>,
    uploaded_by: UserSummary,
}

impl ImageSummary {
    pub(crate) fn new(
        entity::image::Model {
            id,
            filename,
            directory,
            uploaded_at,
            ..
        }: entity::image::Model,
        uploaded_by: UserSummary,
    ) -> Self {
        Self {
            id,
            filename,
            directory,
            uploaded_at,
            uploaded_by,
        }
    }
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ArtistImageQueueTarget {
    artist_id: i32,
    r#type: ArtistImageType,
}

impl From<entity::artist_image_queue::Model> for ArtistImageQueueTarget {
    fn from(
        entity::artist_image_queue::Model {
            artist_id, r#type, ..
        }: entity::artist_image_queue::Model,
    ) -> Self {
        Self { artist_id, r#type }
    }
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ReleaseImageQueueTarget {
    release_id: i32,
    r#type: ReleaseImageType,
}

impl From<entity::release_image_queue::Model> for ReleaseImageQueueTarget {
    fn from(
        entity::release_image_queue::Model {
            release_id, r#type, ..
        }: entity::release_image_queue::Model,
    ) -> Self {
        Self { release_id, r#type }
    }
}

#[derive(Serialize, ToSchema)]
pub(crate) struct ImageQueueDetail {
    id: i32,
    image_id: Option<i32>,
    status: ImageQueueStatus,
    created_at: chrono::DateTime<chrono::FixedOffset>,
    created_by: UserSummary,
    handled_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    handled_by: Option<UserSummary>,
    reverted_at: Option<chrono::DateTime<chrono::FixedOffset>>,
    reverted_by: Option<UserSummary>,
    image: Option<ImageSummary>,
    artist: Option<ArtistImageQueueTarget>,
    release: Option<ReleaseImageQueueTarget>,
}

impl ImageQueueDetail {
    pub(crate) const fn new(
        &entity::image_queue::Model {
            id,
            image_id,
            status,
            created_at,
            handled_at,
            reverted_at,
            ..
        }: &entity::image_queue::Model,
        created_by: UserSummary,
        handled_by: Option<UserSummary>,
        reverted_by: Option<UserSummary>,
        image: Option<ImageSummary>,
        artist: Option<ArtistImageQueueTarget>,
        release: Option<ReleaseImageQueueTarget>,
    ) -> Self {
        Self {
            id,
            image_id,
            status,
            created_at,
            created_by,
            handled_at,
            handled_by,
            reverted_at,
            reverted_by,
            image,
            artist,
            release,
        }
    }
}
