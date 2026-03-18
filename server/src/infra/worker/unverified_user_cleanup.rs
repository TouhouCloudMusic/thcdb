use std::str::FromStr;

use apalis::prelude::Data;
use apalis_cron::Schedule;
use chrono::Utc;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use crate::infra::worker::WorkerState;

#[derive(Clone, Debug, Default)]
pub(super) struct UnverifiedUserCleanupJob;

pub(super) fn schedule() -> Schedule {
    Schedule::from_str("0 0 * * * *")
        .expect("unverified user cleanup schedule must be valid")
}

pub(super) async fn handle(
    _job: UnverifiedUserCleanupJob,
    state: Data<WorkerState>,
) {
    let cutoff: chrono::DateTime<chrono::FixedOffset> =
        (Utc::now() - chrono::Duration::hours(24)).into();

    let user_ids = match entity::user::Entity::find()
        .select_only()
        .column(entity::user::Column::Id)
        .filter(entity::user::Column::EmailVerified.eq(false))
        .filter(entity::user::Column::CreatedAt.lt(cutoff))
        .into_tuple::<i32>()
        .all(&state.repo.conn)
        .await
    {
        Ok(user_ids) => user_ids,
        Err(err) => {
            tracing::error!(?err, "Failed to query expired unverified users");
            return;
        }
    };

    if user_ids.is_empty() {
        return;
    }

    match entity::user::Entity::delete_many()
        .filter(entity::user::Column::Id.is_in(user_ids))
        .exec(&state.repo.conn)
        .await
    {
        Ok(res) => {
            if res.rows_affected > 0 {
                tracing::info!(
                    deleted = res.rows_affected,
                    "Expired unverified users deleted"
                );
            }
        }
        Err(err) => {
            tracing::error!(?err, "Failed to delete expired unverified users");
        }
    }
}
