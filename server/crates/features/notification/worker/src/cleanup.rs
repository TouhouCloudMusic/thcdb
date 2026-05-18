use std::str::FromStr;

use chrono::Utc;
use infra_db::SeaOrmRepository;
use infra_worker::{Data, Schedule};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

#[derive(Clone, Debug, Default)]
pub struct NotificationCleanupJob;

#[derive(Clone)]
pub struct WorkerState {
    pub repo: SeaOrmRepository,
    pub retention_days: i64,
}

#[expect(
    clippy::missing_panics_doc,
    reason = "static cron expression is validated during worker startup"
)]
pub fn schedule() -> Schedule {
    Schedule::from_str("0 0 0 * * *")
        .expect("notification cleanup schedule must be valid")
}

pub async fn handle(_job: NotificationCleanupJob, state: Data<WorkerState>) {
    let cutoff: chrono::DateTime<chrono::FixedOffset> =
        (Utc::now() - chrono::Duration::days(state.retention_days)).into();

    match entity::notification::Entity::delete_many()
        .filter(entity::notification::Column::CreatedAt.lt(cutoff))
        .exec(&state.repo.conn)
        .await
    {
        Ok(res) => {
            if res.rows_affected > 0 {
                log::info!(
                    target: "features.notification.cleanup",
                    deleted = res.rows_affected;
                    "expired notifications deleted"
                );
            }
        }
        Err(err) => {
            log::error!(
                target: "features.notification.cleanup",
                error:? = err;
                "failed to clean up notifications"
            );
        }
    }
}
