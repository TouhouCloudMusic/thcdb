use std::num::NonZeroU16;

use infra_db::DatabaseConnection;
use infra_db::error::{DatabaseError, DatabaseResultExt};

use crate::repo::CleanupCounts;

mod repo;

const NOTIFICATION_CLAIM_LIMIT: u64 = 1_000;
const ENTRY_DELETE_LIMIT: u64 = 1_000;

pub async fn run(
    conn: &DatabaseConnection,
    retention_days: NonZeroU16,
) -> Result<(), DatabaseError> {
    let mut counts = CleanupCounts::default();
    let cutoff = repo::load_retention_cutoff(conn, retention_days)
        .await
        .db_context("load notification retention cutoff")?;

    loop {
        let batch = repo::delete_expired_notification_batch(
            conn,
            cutoff,
            NOTIFICATION_CLAIM_LIMIT,
            ENTRY_DELETE_LIMIT,
        )
        .await
        .db_context("delete expired notification batch")?;
        if !batch.is_empty() {
            counts += batch;
            continue;
        }

        let batch = repo::purge_expired_entry_batch(
            conn,
            cutoff,
            NOTIFICATION_CLAIM_LIMIT,
            ENTRY_DELETE_LIMIT,
        )
        .await
        .db_context("purge expired notification entries")?;
        if batch.is_empty() {
            break;
        }
        counts += batch;
    }

    if !counts.is_empty() {
        log::info!(
            target: "features.notification.cleanup",
            notifications = counts.notifications,
            entries = counts.entries,
            notification_events = counts.notification_events;
            "expired notifications cleaned up"
        );
    }

    Ok(())
}
