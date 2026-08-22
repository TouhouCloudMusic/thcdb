use chrono::{DateTime, FixedOffset};
use entity::{
    account_role_changed_notification_event,
    comment_created_notification_event, notification_event,
};
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::ActiveValue::{NotSet, Set};
use sea_orm::{DatabaseTransaction, EntityTrait, TryInsert, TryInsertResult};
use sea_query::{Expr, OnConflict};

use super::delivery::CreateNotificationsCommand;
use crate::event::NotificationEventReferences;
use crate::{
    CorrectionModerationAction, ImageQueueModerationAction,
    NotificationEventType,
};

impl CreateNotificationsCommand {
    pub(super) const fn actor_id(&self) -> i32 {
        match self {
            Self::CorrectionReviewRequested { actor_id, .. }
            | Self::CorrectionUpdated { actor_id, .. }
            | Self::CorrectionModerated { actor_id, .. }
            | Self::CommentCreated { actor_id, .. }
            | Self::UserFollowed { actor_id, .. }
            | Self::CollectionFollowed { actor_id, .. }
            | Self::CollectionItemAdded { actor_id, .. }
            | Self::ImageQueueModerated { actor_id, .. }
            | Self::AccountRoleChanged { actor_id, .. } => *actor_id,
        }
    }

    const fn event_type(&self) -> NotificationEventType {
        match self {
            Self::CorrectionReviewRequested { .. } => {
                NotificationEventType::CorrectionReviewRequested
            }
            Self::CorrectionUpdated { .. } => {
                NotificationEventType::CorrectionUpdated
            }
            Self::CorrectionModerated { action, .. } => match action {
                CorrectionModerationAction::Approved => {
                    NotificationEventType::CorrectionApproved
                }
                CorrectionModerationAction::Rejected => {
                    NotificationEventType::CorrectionRejected
                }
            },
            Self::CommentCreated { .. } => {
                NotificationEventType::CommentCreated
            }
            Self::UserFollowed { .. } => NotificationEventType::UserFollowed,
            Self::CollectionFollowed { .. } => {
                NotificationEventType::CollectionFollowed
            }
            Self::CollectionItemAdded { .. } => {
                NotificationEventType::CollectionItemAdded
            }
            Self::ImageQueueModerated { action, .. } => match action {
                ImageQueueModerationAction::Approved => {
                    NotificationEventType::ImageQueueApproved
                }
                ImageQueueModerationAction::Rejected => {
                    NotificationEventType::ImageQueueRejected
                }
                ImageQueueModerationAction::Reverted => {
                    NotificationEventType::ImageQueueReverted
                }
            },
            Self::AccountRoleChanged { .. } => {
                NotificationEventType::AccountRoleChanged
            }
        }
    }

    pub(super) const fn references(&self) -> NotificationEventReferences {
        match self {
            Self::CorrectionReviewRequested { correction_id, .. }
            | Self::CorrectionUpdated { correction_id, .. }
            | Self::CorrectionModerated { correction_id, .. } => {
                NotificationEventReferences::Correction(*correction_id)
            }
            Self::CommentCreated {
                thread_id,
                comment_id,
                ..
            } => NotificationEventReferences::Comment {
                thread_id: *thread_id,
                comment_id: *comment_id,
            },
            Self::UserFollowed { target_user_id, .. }
            | Self::AccountRoleChanged { target_user_id, .. } => {
                NotificationEventReferences::User(*target_user_id)
            }
            Self::CollectionFollowed { collection_id, .. }
            | Self::CollectionItemAdded { collection_id, .. } => {
                NotificationEventReferences::UserCollection(*collection_id)
            }
            Self::ImageQueueModerated { image_queue_id, .. } => {
                NotificationEventReferences::ImageQueue(*image_queue_id)
            }
        }
    }

    const fn occurred_at(&self) -> Option<DateTime<FixedOffset>> {
        match self {
            Self::CommentCreated { occurred_at, .. } => Some(*occurred_at),
            _ => None,
        }
    }

    fn idempotency_key(&self) -> Option<String> {
        match self {
            Self::CorrectionReviewRequested { correction_id, .. } => {
                Some(format!(
                    "notification:v1:kind=correction_review_requested:correction={correction_id}"
                ))
            }
            Self::CorrectionUpdated {
                correction_id,
                entity_history_id,
                ..
            } => Some(format!(
                "notification:v1:kind=correction_updated:correction={correction_id}:history={entity_history_id}"
            )),
            Self::CorrectionModerated {
                correction_id,
                action,
                ..
            } => {
                let action = match action {
                    CorrectionModerationAction::Approved => "approved",
                    CorrectionModerationAction::Rejected => "rejected",
                };
                Some(format!(
                    "notification:v1:kind=correction_moderated:correction={correction_id}:action={action}"
                ))
            }
            Self::CommentCreated { comment_id, .. } => Some(format!(
                "notification:v1:kind=comment_created:comment={comment_id}"
            )),
            Self::CollectionItemAdded { item_id, .. } => Some(format!(
                "notification:v1:kind=collection_item_added:item={item_id}"
            )),
            Self::ImageQueueModerated {
                image_queue_id,
                action,
                ..
            } => {
                let action = match action {
                    ImageQueueModerationAction::Approved => "approved",
                    ImageQueueModerationAction::Rejected => "rejected",
                    ImageQueueModerationAction::Reverted => "reverted",
                };
                Some(format!(
                    "notification:v1:kind=image_queue_moderated:queue={image_queue_id}:action={action}"
                ))
            }
            Self::UserFollowed { .. }
            | Self::CollectionFollowed { .. }
            | Self::AccountRoleChanged { .. } => None,
        }
    }

    async fn insert_data(
        &self,
        conn: &DatabaseTransaction,
        notification_event_id: i64,
    ) -> Result<(), DatabaseError> {
        match self {
            Self::CommentCreated { content, .. } => {
                comment_created_notification_event::Entity::insert(
                    comment_created_notification_event::ActiveModel {
                        notification_event_id: Set(notification_event_id),
                        content: Set(content.clone()),
                    },
                )
                .exec_without_returning(conn)
                .await
                .db_operation("insert comment created notification data")?;
            }
            Self::AccountRoleChanged { new_roles, .. } => {
                let models = new_roles.iter().copied().map(|role_id| {
                    account_role_changed_notification_event::ActiveModel {
                        notification_event_id: Set(notification_event_id),
                        role_id: Set(role_id),
                    }
                });
                account_role_changed_notification_event::Entity::insert_many(
                    models,
                )
                .on_empty_do_nothing()
                .exec_without_returning(conn)
                .await
                .db_operation(
                    "insert account role changed notification data",
                )?;
            }
            Self::CorrectionReviewRequested { .. }
            | Self::CorrectionUpdated { .. }
            | Self::CorrectionModerated { .. }
            | Self::UserFollowed { .. }
            | Self::CollectionFollowed { .. }
            | Self::CollectionItemAdded { .. }
            | Self::ImageQueueModerated { .. } => {}
        }

        Ok(())
    }
}

impl CreateNotificationsCommand {
    /// Returns `None` when an event with the same idempotency key exists.
    pub(super) async fn create_event(
        &self,
        conn: &DatabaseTransaction,
    ) -> Result<Option<NotificationEventId>, DatabaseError> {
        let event_type = self.event_type();
        let references = self.references();
        let occurred_at = self.occurred_at().map_or(NotSet, Set);
        let mut model = notification_event::ActiveModel {
            id: NotSet,
            event_type: Set(event_type.into()),
            idempotency_key: Set(self.idempotency_key()),
            actor_id: Set(self.actor_id()),
            occurred_at,
            correction_id: Set(None),
            image_queue_id: Set(None),
            comment_thread_id: Set(None),
            comment_id: Set(None),
            target_user_id: Set(None),
            user_collection_id: Set(None),
        };

        match references {
            NotificationEventReferences::Correction(id) => {
                model.correction_id = Set(Some(id));
            }
            NotificationEventReferences::ImageQueue(id) => {
                model.image_queue_id = Set(Some(id));
            }
            NotificationEventReferences::Comment {
                thread_id,
                comment_id,
            } => {
                model.comment_thread_id = Set(Some(thread_id));
                model.comment_id = Set(Some(comment_id));
            }
            NotificationEventReferences::User(id) => {
                model.target_user_id = Set(Some(id));
            }
            NotificationEventReferences::UserCollection(id) => {
                model.user_collection_id = Set(Some(id));
            }
        }

        let inserted = TryInsert::one(model)
            .on_conflict(
                OnConflict::column(notification_event::Column::IdempotencyKey)
                    .target_and_where(
                        Expr::col(notification_event::Column::IdempotencyKey)
                            .is_not_null(),
                    )
                    .do_nothing()
                    .to_owned(),
            )
            .exec(conn)
            .await
            .db_operation("insert notification event")?;

        match inserted {
            TryInsertResult::Inserted(result) => {
                let id = NotificationEventId(result.last_insert_id);
                self.insert_data(conn, id.into()).await?;

                Ok(Some(id))
            }
            TryInsertResult::Conflicted => Ok(None),
            TryInsertResult::Empty => {
                unreachable!("TryInsert::one returned Empty")
            }
        }
    }
}

#[derive(Clone, Copy)]
pub(super) struct NotificationEventId(i64);

impl From<NotificationEventId> for i64 {
    fn from(id: NotificationEventId) -> Self {
        id.0
    }
}
