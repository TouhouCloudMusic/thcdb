use entity::enums::{
    NotificationAggregateKind as DbNotificationAggregateKind,
    NotificationEventType as DbNotificationEventType,
};
use sea_orm::Value;
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use utoipa::ToSchema;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NotificationEventType {
    CorrectionReviewRequested,
    CorrectionUpdated,
    CorrectionApproved,
    CorrectionRejected,
    CommentCreated,
    UserFollowed,
    CollectionFollowed,
    CollectionItemAdded,
    ImageQueueApproved,
    ImageQueueRejected,
    ImageQueueReverted,
    AccountRoleChanged,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema,
)]
pub enum CorrectionModerationAction {
    Approved,
    Rejected,
}

#[derive(
    Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema,
)]
pub enum ImageQueueModerationAction {
    Approved,
    Rejected,
    Reverted,
}

impl From<NotificationEventType> for DbNotificationEventType {
    fn from(event_type: NotificationEventType) -> Self {
        match event_type {
            NotificationEventType::CorrectionReviewRequested => {
                Self::CorrectionReviewRequested
            }
            NotificationEventType::CorrectionUpdated => Self::CorrectionUpdated,
            NotificationEventType::CorrectionApproved => {
                Self::CorrectionApproved
            }
            NotificationEventType::CorrectionRejected => {
                Self::CorrectionRejected
            }
            NotificationEventType::CommentCreated => Self::CommentCreated,
            NotificationEventType::UserFollowed => Self::UserFollowed,
            NotificationEventType::CollectionFollowed => {
                Self::CollectionFollowed
            }
            NotificationEventType::CollectionItemAdded => {
                Self::CollectionItemAdded
            }
            NotificationEventType::ImageQueueApproved => {
                Self::ImageQueueApproved
            }
            NotificationEventType::ImageQueueRejected => {
                Self::ImageQueueRejected
            }
            NotificationEventType::ImageQueueReverted => {
                Self::ImageQueueReverted
            }
            NotificationEventType::AccountRoleChanged => {
                Self::AccountRoleChanged
            }
        }
    }
}

impl From<DbNotificationEventType> for NotificationEventType {
    fn from(event_type: DbNotificationEventType) -> Self {
        match event_type {
            DbNotificationEventType::CorrectionReviewRequested => {
                Self::CorrectionReviewRequested
            }
            DbNotificationEventType::CorrectionUpdated => {
                Self::CorrectionUpdated
            }
            DbNotificationEventType::CorrectionApproved => {
                Self::CorrectionApproved
            }
            DbNotificationEventType::CorrectionRejected => {
                Self::CorrectionRejected
            }
            DbNotificationEventType::CommentCreated => Self::CommentCreated,
            DbNotificationEventType::UserFollowed => Self::UserFollowed,
            DbNotificationEventType::CollectionFollowed => {
                Self::CollectionFollowed
            }
            DbNotificationEventType::CollectionItemAdded => {
                Self::CollectionItemAdded
            }
            DbNotificationEventType::ImageQueueApproved => {
                Self::ImageQueueApproved
            }
            DbNotificationEventType::ImageQueueRejected => {
                Self::ImageQueueRejected
            }
            DbNotificationEventType::ImageQueueReverted => {
                Self::ImageQueueReverted
            }
            DbNotificationEventType::AccountRoleChanged => {
                Self::AccountRoleChanged
            }
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, strum::EnumIter)]
pub enum NotificationAggregateKind {
    CorrectionReviewRequested,
    CorrectionUpdated,
    CorrectionModerated,
    CommentReplied,
    CommentThreadUpdated,
    UserFollowed,
    CollectionFollowed,
    CollectionItemAdded,
    ImageQueueModerated,
    AccountRoleChanged,
}

impl From<NotificationAggregateKind> for DbNotificationAggregateKind {
    fn from(kind: NotificationAggregateKind) -> Self {
        match kind {
            NotificationAggregateKind::CorrectionReviewRequested => {
                Self::CorrectionReviewRequested
            }
            NotificationAggregateKind::CorrectionUpdated => {
                Self::CorrectionUpdated
            }
            NotificationAggregateKind::CorrectionModerated => {
                Self::CorrectionModerated
            }
            NotificationAggregateKind::CommentReplied => Self::CommentReplied,
            NotificationAggregateKind::CommentThreadUpdated => {
                Self::CommentThreadUpdated
            }
            NotificationAggregateKind::UserFollowed => Self::UserFollowed,
            NotificationAggregateKind::CollectionFollowed => {
                Self::CollectionFollowed
            }
            NotificationAggregateKind::CollectionItemAdded => {
                Self::CollectionItemAdded
            }
            NotificationAggregateKind::ImageQueueModerated => {
                Self::ImageQueueModerated
            }
            NotificationAggregateKind::AccountRoleChanged => {
                Self::AccountRoleChanged
            }
        }
    }
}

impl From<NotificationAggregateKind> for Value {
    fn from(kind: NotificationAggregateKind) -> Self {
        DbNotificationAggregateKind::from(kind).into()
    }
}

impl From<DbNotificationAggregateKind> for NotificationAggregateKind {
    fn from(kind: DbNotificationAggregateKind) -> Self {
        match kind {
            DbNotificationAggregateKind::CorrectionReviewRequested => {
                Self::CorrectionReviewRequested
            }
            DbNotificationAggregateKind::CorrectionUpdated => {
                Self::CorrectionUpdated
            }
            DbNotificationAggregateKind::CorrectionModerated => {
                Self::CorrectionModerated
            }
            DbNotificationAggregateKind::CommentReplied => Self::CommentReplied,
            DbNotificationAggregateKind::CommentThreadUpdated => {
                Self::CommentThreadUpdated
            }
            DbNotificationAggregateKind::UserFollowed => Self::UserFollowed,
            DbNotificationAggregateKind::CollectionFollowed => {
                Self::CollectionFollowed
            }
            DbNotificationAggregateKind::CollectionItemAdded => {
                Self::CollectionItemAdded
            }
            DbNotificationAggregateKind::ImageQueueModerated => {
                Self::ImageQueueModerated
            }
            DbNotificationAggregateKind::AccountRoleChanged => {
                Self::AccountRoleChanged
            }
        }
    }
}

/// A positive sequence number of an entry in a notification aggregate.
#[derive(
    Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, derive_more::Into,
)]
pub struct Seq(i64);

impl Seq {
    #[must_use]
    pub const fn new(value: i64) -> Option<Self> {
        if value > 0 { Some(Self(value)) } else { None }
    }

    #[must_use]
    pub const fn new_static<const VALUE: i64>() -> Self {
        const { assert!(VALUE > 0) };
        Self(VALUE)
    }
}

/// Category for frontend filtering of notifications.
#[derive(
    Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema,
)]
pub enum NotificationCategory {
    Correction,
    Comment,
    Social,
    Collection,
    ImageQueue,
    Account,
}

impl NotificationCategory {
    pub fn kinds(self) -> impl Iterator<Item = NotificationAggregateKind> {
        NotificationAggregateKind::iter()
            .filter(move |kind| Self::from(*kind) == self)
    }
}

impl From<NotificationAggregateKind> for NotificationCategory {
    fn from(kind: NotificationAggregateKind) -> Self {
        match kind {
            NotificationAggregateKind::CorrectionReviewRequested
            | NotificationAggregateKind::CorrectionUpdated
            | NotificationAggregateKind::CorrectionModerated => {
                Self::Correction
            }
            NotificationAggregateKind::CommentReplied
            | NotificationAggregateKind::CommentThreadUpdated => Self::Comment,
            NotificationAggregateKind::UserFollowed => Self::Social,
            NotificationAggregateKind::CollectionFollowed
            | NotificationAggregateKind::CollectionItemAdded => {
                Self::Collection
            }
            NotificationAggregateKind::ImageQueueModerated => Self::ImageQueue,
            NotificationAggregateKind::AccountRoleChanged => Self::Account,
        }
    }
}
