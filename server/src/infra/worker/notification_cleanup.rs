use std::time::Duration;

use chrono::Utc;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use super::Worker;

pub(super) fn init(worker: &Worker) {
    let repo = worker.repo.clone();
    let retention_days = worker.notification_retention_days;

    tokio::spawn(async move {
        tracing::info!(
            retention_days = retention_days,
            "Notification cleanup worker started",
        );

        loop {
            let cutoff: chrono::DateTime<chrono::FixedOffset> =
                (Utc::now() - chrono::Duration::days(retention_days)).into();

            match entity::notification::Entity::delete_many()
                .filter(entity::notification::Column::CreatedAt.lt(cutoff))
                .exec(&repo.conn)
                .await
            {
                Ok(res) => {
                    if res.rows_affected > 0 {
                        tracing::info!(
                            deleted = res.rows_affected,
                            "Expired notifications deleted"
                        );
                    }
                }
                Err(err) => {
                    tracing::error!(?err, "Failed to cleanup notifications");
                }
            }

            tokio::time::sleep(Duration::from_hours(24)).await;
        }
    });
}
