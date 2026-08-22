use chrono::{DateTime, FixedOffset};

use super::super::repo;
use super::{
    NotificationParseError, ReferenceIds, ReferenceKind, References,
    required_data,
};
use crate::model::{CommentPreview, NotificationBody};

pub(super) struct Comment {
    id: Option<i32>,
    actor_id: i32,
    content: String,
    created_at: DateTime<FixedOffset>,
}

impl Comment {
    fn collect_reference_ids(&self, ids: &mut ReferenceIds) {
        ids.insert(ReferenceKind::User, self.actor_id);
        ids.extend(self.id.map(|id| (ReferenceKind::Comment, id)));
    }

    pub(super) fn into_preview(
        self,
        references: &References,
    ) -> CommentPreview {
        let actor = references.user(self.actor_id);

        if let Some(id) =
            self.id.filter(|&id| references.is_visible_comment(id))
        {
            CommentPreview::Visible {
                id,
                actor,
                content: self.content,
                created_at: self.created_at,
            }
        } else {
            CommentPreview::Deleted {
                actor,
                created_at: self.created_at,
            }
        }
    }
}

pub(super) struct CommentCreatedEvent {
    thread_id: Option<i32>,
    comment: Comment,
}

impl CommentCreatedEvent {
    pub(super) fn parse(
        event: repo::ListedNotificationEvent,
    ) -> Result<Self, NotificationParseError> {
        let repo::ListedNotificationEvent {
            actor_id,
            occurred_at,
            comment_thread_id,
            comment_id,
            comment_content,
            ..
        } = event;
        let content = required_data(
            comment_content,
            "comment_created_notification_event",
        )?;

        Ok(Self {
            thread_id: comment_thread_id,
            comment: Comment {
                id: comment_id,
                actor_id,
                content,
                created_at: occurred_at,
            },
        })
    }

    pub(super) fn collect_reference_ids(&self, ids: &mut ReferenceIds) {
        ids.extend(self.thread_id.map(|id| (ReferenceKind::CommentThread, id)));
        self.comment.collect_reference_ids(ids);
    }

    pub(super) fn into_thread_update_body(
        self,
        references: &References,
        mut commenter_summary: repo::ThreadUnreadCommenterSummary,
    ) -> NotificationBody {
        if commenter_summary.displayed_user_ids.is_empty() {
            commenter_summary
                .displayed_user_ids
                .push(self.comment.actor_id);
        }

        NotificationBody::CommentThreadUpdated {
            container: references.comment_thread_target(self.thread_id),
            commenters: commenter_summary
                .displayed_user_ids
                .into_iter()
                .map(|user_id| references.user(user_id))
                .collect(),
            additional_commenter_count: commenter_summary.additional_count,
            latest: self.comment.into_preview(references),
        }
    }

    pub(super) fn into_reply_body(
        self,
        references: &References,
    ) -> NotificationBody {
        NotificationBody::CommentReplied {
            container: references.comment_thread_target(self.thread_id),
            reply: self.comment.into_preview(references),
        }
    }
}
