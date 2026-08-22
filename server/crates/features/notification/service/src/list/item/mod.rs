use notification_core::{
    CorrectionModerationAction, ImageQueueModerationAction,
    NotificationAggregateKind, NotificationEventType,
};
use sea_orm::ConnectionTrait;
use sea_orm::prelude::Uuid;

use self::comment::CommentCreatedEvent;
use super::references::{ReferenceIds, ReferenceKind, References};
use super::repo;
use crate::Error;
use crate::model::{NotificationBody, NotificationItem};

mod comment;

const LOG_TARGET: &str = "features.notification.service";
const CORRECTION_REF: &str =
    "correction events have correction_id by database constraint";
const IMAGE_QUEUE_REF: &str =
    "image queue events have image_queue_id by database constraint";
const TARGET_USER_REF: &str =
    "targeted user events have target_user_id by database constraint";

struct NotificationParseError(String);

impl NotificationParseError {
    fn log(
        self,
        notification_id: Uuid,
        notification_aggregate_kind: NotificationAggregateKind,
    ) {
        let Self(message) = self;
        log::error!(
            target: LOG_TARGET,
            notification_id:% = notification_id,
            notification_aggregate_kind:? = notification_aggregate_kind,
            error:% = message;
            "skipping invalid notification"
        );
    }
}

pub(super) struct ParsedNotification {
    pub(super) listed: repo::ListedNotification,
    body: ParsedBody,
}

impl ParsedNotification {
    fn parse(
        raw_notification: repo::RawNotification,
        recipient_id: i32,
    ) -> Result<Self, NotificationParseError> {
        let repo::RawNotification { listed, event } = raw_notification;

        if listed.kind != NotificationAggregateKind::CommentThreadUpdated
            && listed.through_seq != 1
        {
            return Err(NotificationParseError(format!(
                "single-event notification has entry sequence {}",
                listed.through_seq
            )));
        }

        let body = ParsedBody::parse(listed.kind, event, recipient_id)?;

        Ok(Self { listed, body })
    }

    fn into_item(
        self,
        references: &References,
        commenter_summary: repo::ThreadUnreadCommenterSummary,
    ) -> NotificationItem {
        let Self { listed, body } = self;

        NotificationItem {
            id: listed.id,
            body: body.into_body(references, commenter_summary),
            is_unread: listed.is_unread(),
            through_seq: listed.through_seq.to_string(),
            saved_at: listed.saved_at,
            created_at: listed.created_at,
            last_activity_at: listed.last_activity_at,
        }
    }
}

pub(super) fn parse_notifications(
    raw_notifications: Vec<repo::RawNotification>,
    recipient_id: i32,
) -> Vec<ParsedNotification> {
    let mut notifications = Vec::with_capacity(raw_notifications.len());

    for raw_notification in raw_notifications {
        let notification_id = raw_notification.listed.id;
        let notification_aggregate_kind = raw_notification.listed.kind;

        match ParsedNotification::parse(raw_notification, recipient_id) {
            Ok(notification) => notifications.push(notification),
            Err(error) => {
                error.log(notification_id, notification_aggregate_kind);
            }
        }
    }

    notifications
}

pub(super) async fn resolve_items(
    conn: &impl ConnectionTrait,
    recipient_id: i32,
    notifications: Vec<ParsedNotification>,
) -> Result<Vec<NotificationItem>, Error> {
    let mut unread_commenter_summaries =
        repo::load_thread_unread_commenter_summaries(
            conn,
            notifications
                .iter()
                .map(|notification| &notification.listed),
        )
        .await?;

    let mut reference_ids = ReferenceIds::default();
    for notification in &notifications {
        notification.body.collect_reference_ids(&mut reference_ids);
    }
    for summary in unread_commenter_summaries.values() {
        reference_ids.extend(
            summary
                .displayed_user_ids
                .iter()
                .map(|&id| (ReferenceKind::User, id)),
        );
    }

    let references =
        References::load(conn, recipient_id, reference_ids).await?;

    Ok(notifications
        .into_iter()
        .map(|notification| {
            let notification_id = notification.listed.id;
            let commenter_summary = unread_commenter_summaries
                .remove(&notification_id)
                .unwrap_or_default();
            notification.into_item(&references, commenter_summary)
        })
        .collect())
}

enum ParsedBody {
    CommentThreadUpdated(CommentCreatedEvent),
    CommentReplied(CommentCreatedEvent),
    CorrectionReviewRequested {
        actor_id: i32,
        correction_id: i32,
    },
    CorrectionUpdated {
        actor_id: i32,
        correction_id: i32,
    },
    CorrectionModerated {
        actor_id: i32,
        correction_id: i32,
        action: CorrectionModerationAction,
    },
    UserFollowed {
        actor_id: i32,
    },
    CollectionFollowed {
        actor_id: i32,
        collection_id: Option<i32>,
    },
    CollectionItemAdded {
        actor_id: i32,
        collection_id: Option<i32>,
    },
    ImageQueueModerated {
        actor_id: i32,
        image_queue_id: i32,
        action: ImageQueueModerationAction,
    },
    AccountRoleChanged {
        actor_id: i32,
        role_names: Vec<String>,
    },
}

impl ParsedBody {
    fn parse(
        kind: NotificationAggregateKind,
        event: repo::ListedNotificationEvent,
        recipient_id: i32,
    ) -> Result<Self, NotificationParseError> {
        use NotificationAggregateKind as Aggregate;
        use NotificationEventType as Event;

        let event_type = NotificationEventType::from(event.event_type);
        let actor_id = event.actor_id;
        let correction_id = event.correction_id;
        let queue_id = event.image_queue_id;
        let target_user_id = event.target_user_id;

        Ok(match (kind, event_type) {
            (
                Aggregate::CommentThreadUpdated | Aggregate::CommentReplied,
                Event::CommentCreated,
            ) => {
                let event = CommentCreatedEvent::parse(event)?;
                if kind == Aggregate::CommentThreadUpdated {
                    Self::CommentThreadUpdated(event)
                } else {
                    Self::CommentReplied(event)
                }
            }
            (
                Aggregate::CorrectionReviewRequested,
                Event::CorrectionReviewRequested,
            ) => Self::CorrectionReviewRequested {
                actor_id,
                correction_id: correction_id.expect(CORRECTION_REF),
            },
            (Aggregate::CorrectionUpdated, Event::CorrectionUpdated) => {
                Self::CorrectionUpdated {
                    actor_id,
                    correction_id: correction_id.expect(CORRECTION_REF),
                }
            }
            (Aggregate::CorrectionModerated, Event::CorrectionApproved) => {
                Self::CorrectionModerated {
                    actor_id,
                    correction_id: correction_id.expect(CORRECTION_REF),
                    action: CorrectionModerationAction::Approved,
                }
            }
            (Aggregate::CorrectionModerated, Event::CorrectionRejected) => {
                Self::CorrectionModerated {
                    actor_id,
                    correction_id: correction_id.expect(CORRECTION_REF),
                    action: CorrectionModerationAction::Rejected,
                }
            }
            (Aggregate::UserFollowed, Event::UserFollowed) => {
                require_recipient_reference(target_user_id, recipient_id)?;
                Self::UserFollowed { actor_id }
            }
            (Aggregate::CollectionFollowed, Event::CollectionFollowed) => {
                Self::CollectionFollowed {
                    actor_id,
                    collection_id: event.user_collection_id,
                }
            }
            (Aggregate::CollectionItemAdded, Event::CollectionItemAdded) => {
                Self::CollectionItemAdded {
                    actor_id,
                    collection_id: event.user_collection_id,
                }
            }
            (Aggregate::ImageQueueModerated, Event::ImageQueueApproved) => {
                Self::ImageQueueModerated {
                    actor_id,
                    image_queue_id: queue_id.expect(IMAGE_QUEUE_REF),
                    action: ImageQueueModerationAction::Approved,
                }
            }
            (Aggregate::ImageQueueModerated, Event::ImageQueueRejected) => {
                Self::ImageQueueModerated {
                    actor_id,
                    image_queue_id: queue_id.expect(IMAGE_QUEUE_REF),
                    action: ImageQueueModerationAction::Rejected,
                }
            }
            (Aggregate::ImageQueueModerated, Event::ImageQueueReverted) => {
                Self::ImageQueueModerated {
                    actor_id,
                    image_queue_id: queue_id.expect(IMAGE_QUEUE_REF),
                    action: ImageQueueModerationAction::Reverted,
                }
            }
            (Aggregate::AccountRoleChanged, Event::AccountRoleChanged) => {
                require_recipient_reference(target_user_id, recipient_id)?;
                Self::AccountRoleChanged {
                    actor_id,
                    role_names: required_data(
                        event.account_role_names,
                        "account_role_changed_notification_event",
                    )?,
                }
            }
            (kind, event_type) => {
                return Err(NotificationParseError(format!(
                    "event {} has type {event_type:?}, incompatible with aggregate kind {kind:?}",
                    event.id
                )));
            }
        })
    }

    fn collect_reference_ids(&self, ids: &mut ReferenceIds) {
        match self {
            Self::CommentThreadUpdated(thread) => {
                thread.collect_reference_ids(ids);
            }
            Self::CommentReplied(reply) => reply.collect_reference_ids(ids),
            Self::CorrectionReviewRequested {
                actor_id,
                correction_id,
            }
            | Self::CorrectionUpdated {
                actor_id,
                correction_id,
            }
            | Self::CorrectionModerated {
                actor_id,
                correction_id,
                ..
            } => {
                ids.insert(ReferenceKind::User, *actor_id);
                ids.insert(ReferenceKind::Correction, *correction_id);
            }
            Self::UserFollowed { actor_id }
            | Self::AccountRoleChanged { actor_id, .. } => {
                ids.insert(ReferenceKind::User, *actor_id);
            }
            Self::CollectionFollowed {
                actor_id,
                collection_id,
                ..
            }
            | Self::CollectionItemAdded {
                actor_id,
                collection_id,
                ..
            } => {
                ids.insert(ReferenceKind::User, *actor_id);
                ids.extend(
                    collection_id.map(|id| (ReferenceKind::UserCollection, id)),
                );
            }
            Self::ImageQueueModerated {
                actor_id,
                image_queue_id,
                ..
            } => {
                ids.insert(ReferenceKind::User, *actor_id);
                ids.insert(ReferenceKind::ImageQueue, *image_queue_id);
            }
        }
    }

    fn into_body(
        self,
        references: &References,
        commenter_summary: repo::ThreadUnreadCommenterSummary,
    ) -> NotificationBody {
        match self {
            Self::CommentThreadUpdated(thread) => {
                thread.into_thread_update_body(references, commenter_summary)
            }
            Self::CommentReplied(reply) => reply.into_reply_body(references),
            Self::CorrectionReviewRequested {
                actor_id,
                correction_id,
            } => NotificationBody::CorrectionReviewRequested {
                actor: references.user(actor_id),
                correction: references.correction_meta(correction_id),
            },
            Self::CorrectionUpdated {
                actor_id,
                correction_id,
            } => NotificationBody::CorrectionUpdated {
                actor: references.user(actor_id),
                correction: references.correction_meta(correction_id),
            },
            Self::CorrectionModerated {
                actor_id,
                correction_id,
                action,
            } => NotificationBody::CorrectionModerated {
                actor: references.user(actor_id),
                correction: references.correction_meta(correction_id),
                action,
            },
            Self::UserFollowed { actor_id } => NotificationBody::UserFollowed {
                actor: references.user(actor_id),
            },
            Self::CollectionFollowed {
                actor_id,
                collection_id,
            } => NotificationBody::CollectionFollowed {
                actor: references.user(actor_id),
                collection: references.collection_reference(collection_id),
            },
            Self::CollectionItemAdded {
                actor_id,
                collection_id,
            } => NotificationBody::CollectionItemAdded {
                actor: references.user(actor_id),
                collection: references.collection_reference(collection_id),
            },
            Self::ImageQueueModerated {
                actor_id,
                image_queue_id,
                action,
            } => {
                let target = references.image_queue_target(image_queue_id);
                NotificationBody::ImageQueueModerated {
                    actor: references.user(actor_id),
                    image_queue: target.entity.clone(),
                    image_type: target.image_type.clone(),
                    action,
                }
            }
            Self::AccountRoleChanged {
                actor_id,
                role_names,
            } => NotificationBody::AccountRoleChanged {
                actor: references.user(actor_id),
                new_roles: role_names,
            },
        }
    }
}

fn required_data<T>(
    value: Option<T>,
    table: &'static str,
) -> Result<T, NotificationParseError> {
    value.ok_or_else(|| {
        NotificationParseError(format!(
            "event is missing required row in {table}"
        ))
    })
}

fn require_recipient_reference(
    value: Option<i32>,
    recipient_id: i32,
) -> Result<(), NotificationParseError> {
    let target_user_id = value.expect(TARGET_USER_REF);
    if target_user_id != recipient_id {
        return Err(NotificationParseError(
            "event target_user_id does not match the notification recipient"
                .into(),
        ));
    }

    Ok(())
}
