use std::num::NonZeroU8;

use infra_db::error::DatabaseResultExt;
use sea_orm::{AccessMode, IsolationLevel, TransactionTrait};

use crate::inbox::InboxCutoff;
use crate::model::{
    NotificationCursor, NotificationListQuery, NotificationPage,
};
use crate::{Error, Service};

mod item;
mod references;
mod repo;

impl Service {
    pub async fn list_notifications(
        &self,
        recipient_id: i32,
        filter: NotificationListQuery,
        cursor: Option<NotificationCursor>,
        limit: NonZeroU8,
    ) -> Result<NotificationPage, Error> {
        let tx = self
            .repo
            .conn
            .begin_with_config(
                Some(IsolationLevel::RepeatableRead),
                Some(AccessMode::ReadOnly),
            )
            .await
            .db_operation("begin notification list snapshot")?;

        let inbox_cutoff = match cursor {
            Some(cursor) => InboxCutoff::new(cursor.snapshot_inbox_seq),
            None => InboxCutoff::load(&tx, recipient_id).await?,
        };

        let page_size = usize::from(limit.get());
        let lookahead_size = page_size + 1;

        let mut notifications = Vec::with_capacity(lookahead_size);
        let mut before_inbox_seq = cursor.map(|cursor| cursor.before_inbox_seq);

        loop {
            let batch = repo::load_raw_notification_batch(
                &tx,
                recipient_id,
                repo::RawNotificationBatchQuery {
                    state: filter.state,
                    category: filter.category,
                    cutoff: inbox_cutoff,
                    before_inbox_seq,
                    limit: lookahead_size - notifications.len(),
                },
            )
            .await?;
            before_inbox_seq = batch.next_before_inbox_seq;
            notifications.extend(item::parse_notifications(
                batch.raw_notifications,
                recipient_id,
            ));

            if notifications.len() >= lookahead_size || batch.exhausted {
                break;
            }
        }

        let has_next_page = notifications.len() > page_size;
        notifications.truncate(page_size);

        let next_cursor = has_next_page.then(|| {
            let last = notifications
                .last()
                .expect("notification page size is non-zero");

            NotificationCursor {
                snapshot_inbox_seq: inbox_cutoff.inbox_seq(),
                before_inbox_seq: last.listed.head_inbox_seq,
            }
        });

        let items =
            item::resolve_items(&tx, recipient_id, notifications).await?;

        let page = NotificationPage {
            items,
            next_cursor,
            snapshot_inbox_seq: inbox_cutoff.inbox_seq(),
        };

        tx.commit()
            .await
            .db_operation("commit notification list snapshot")?;

        Ok(page)
    }
}
