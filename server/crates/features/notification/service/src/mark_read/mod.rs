use infra_db::error::DatabaseResultExt;
use notification_core::Seq;
use sea_orm::TransactionTrait;
use sea_orm::prelude::Uuid;

use crate::inbox::InboxCutoff;
use crate::{Error, Service};

mod repo;

impl Service {
    pub async fn mark_read(
        &self,
        user_id: i32,
        notification_id: Uuid,
        through_seq: Seq,
    ) -> Result<(), Error> {
        let tx = self
            .repo
            .conn
            .begin()
            .await
            .db_operation("begin mark notification read")?;

        let status = notification_core::mark_notification_read_through(
            &tx,
            user_id,
            notification_id,
            through_seq,
        )
        .await?;

        match status {
            notification_core::ReadStateUpdateStatus::Ok => {
                tx.commit()
                    .await
                    .db_operation("commit mark notification read")?;

                Ok(())
            }
            notification_core::ReadStateUpdateStatus::NotificationNotFound => {
                Err(Error::NotFound)
            }
            notification_core::ReadStateUpdateStatus::InvalidBoundary => {
                Err(Error::BadRequest(
                    "Read boundary exceeds notification sequence",
                ))
            }
        }
    }

    pub async fn mark_unread(
        &self,
        user_id: i32,
        notification_id: Uuid,
        from_seq: Seq,
    ) -> Result<(), Error> {
        let tx = self
            .repo
            .conn
            .begin()
            .await
            .db_operation("begin mark notification unread")?;

        let status = notification_core::mark_notification_unread_from(
            &tx,
            user_id,
            notification_id,
            from_seq,
        )
        .await?;

        match status {
            notification_core::ReadStateUpdateStatus::Ok => {
                tx.commit()
                    .await
                    .db_operation("commit mark notification unread")?;

                Ok(())
            }
            notification_core::ReadStateUpdateStatus::NotificationNotFound => {
                Err(Error::NotFound)
            }
            notification_core::ReadStateUpdateStatus::InvalidBoundary => {
                Err(Error::BadRequest("Unread boundary is no longer available"))
            }
        }
    }

    /// The Inbox boundary excludes entries committed after the page snapshot.
    pub async fn read_all(
        &self,
        user_id: i32,
        inbox_cutoff_seq: i64,
    ) -> Result<(), Error> {
        let tx = self
            .repo
            .conn
            .begin()
            .await
            .db_operation("begin mark all notifications read")?;

        repo::read_all(&tx, user_id, InboxCutoff::new(inbox_cutoff_seq))
            .await?;

        tx.commit()
            .await
            .db_operation("commit mark all notifications read")?;

        Ok(())
    }
}
