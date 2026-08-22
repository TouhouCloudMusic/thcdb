use std::time::Duration;

use enumset::{EnumSet, EnumSetType};

use crate::NotificationAggregateKind;

const FOLLOW_NOTIFICATION_COOLDOWN: Duration = Duration::from_mins(1);
const ITEM_ADDED_NOTIFICATION_COOLDOWN: Duration = Duration::from_mins(30);

#[derive(Clone, Copy)]
pub(crate) enum NotificationEventReferences {
    Correction(i32),
    ImageQueue(i32),
    Comment { thread_id: i32, comment_id: i32 },
    User(i32),
    UserCollection(i32),
}

#[derive(EnumSetType)]
pub(crate) enum DeliveryCooldownScope {
    Actor,
    References,
}

pub(crate) struct DeliveryCooldown {
    pub(crate) duration: Duration,
    pub(crate) scope: EnumSet<DeliveryCooldownScope>,
}

impl NotificationAggregateKind {
    pub(crate) fn delivery_cooldown(self) -> Option<DeliveryCooldown> {
        match self {
            Self::UserFollowed | Self::CollectionFollowed => {
                Some(DeliveryCooldown {
                    duration: FOLLOW_NOTIFICATION_COOLDOWN,
                    scope: [
                        DeliveryCooldownScope::Actor,
                        DeliveryCooldownScope::References,
                    ]
                    .into_iter()
                    .collect(),
                })
            }
            Self::CollectionItemAdded => Some(DeliveryCooldown {
                duration: ITEM_ADDED_NOTIFICATION_COOLDOWN,
                scope: [DeliveryCooldownScope::References]
                    .into_iter()
                    .collect(),
            }),
            Self::CorrectionReviewRequested
            | Self::CorrectionUpdated
            | Self::CorrectionModerated
            | Self::CommentReplied
            | Self::CommentThreadUpdated
            | Self::ImageQueueModerated
            | Self::AccountRoleChanged => None,
        }
    }
}
