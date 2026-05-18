use std::str::FromStr;

use chrono::Utc;
use infra_db::SeaOrmRepository;
use infra_worker::{Data, Schedule};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

#[derive(Clone, Debug, Default)]
pub struct UnverifiedUserCleanupJob;

#[derive(Clone)]
pub struct WorkerState {
    pub repo: SeaOrmRepository,
}

#[expect(
    clippy::missing_panics_doc,
    reason = "static cron expression is validated during worker startup"
)]
pub fn schedule() -> Schedule {
    Schedule::from_str("0 0 * * * *")
        .expect("unverified user cleanup schedule must be valid")
}

pub async fn handle(_job: UnverifiedUserCleanupJob, state: Data<WorkerState>) {
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
            log::error!(
                target: "features.auth.sign_up.cleanup",
                error:? = err;
                "failed to query expired unverified users"
            );
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
                log::info!(
                    target: "features.auth.sign_up.cleanup",
                    deleted = res.rows_affected;
                    "expired unverified users deleted"
                );
            }
        }
        Err(err) => {
            log::error!(
                target: "features.auth.sign_up.cleanup",
                error:? = err;
                "failed to delete expired unverified users"
            );
        }
    }
}
