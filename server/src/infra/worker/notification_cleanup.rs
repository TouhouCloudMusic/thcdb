use std::str::FromStr;

use apalis::prelude::Data;
use apalis_cron::Schedule;
use chrono::Utc;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

use crate::infra::worker::WorkerState;

#[derive(Clone, Debug, Default)]
pub(super) struct NotificationCleanupJob;

pub(super) fn schedule() -> Schedule {
    // TODO: 1.0 builder
    Schedule::from_str("0 0 0 * * *")
        .expect("notification cleanup schedule must be valid")
}

pub(super) async fn handle(
    _job: NotificationCleanupJob,
    state: Data<WorkerState>,
) {
    let cutoff: chrono::DateTime<chrono::FixedOffset> = (Utc::now()
        - chrono::Duration::days(state.notification_retention_days))
    .into();

    match entity::notification::Entity::delete_many()
        .filter(entity::notification::Column::CreatedAt.lt(cutoff))
        .exec(&state.repo.conn)
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
}
