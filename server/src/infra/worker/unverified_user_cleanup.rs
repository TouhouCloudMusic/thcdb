use std::time::Duration;

use chrono::Utc;
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use super::Worker;

pub(super) fn init(worker: &Worker) {
    let repo = worker.repo.clone();

    tokio::spawn(async move {
        tracing::info!("Unverified user cleanup worker started");

        loop {
            let cutoff: chrono::DateTime<chrono::FixedOffset> =
                (Utc::now() - chrono::Duration::hours(24)).into();

            match entity::user::Entity::find()
                .select_only()
                .column(entity::user::Column::Id)
                .filter(entity::user::Column::EmailVerified.eq(false))
                .filter(entity::user::Column::CreatedAt.lt(cutoff))
                .into_tuple::<i32>()
                .all(&repo.conn)
                .await
            {
                Ok(user_ids) => {
                    if !user_ids.is_empty() {
                        match entity::user::Entity::delete_many()
                            .filter(entity::user::Column::Id.is_in(user_ids))
                            .exec(&repo.conn)
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
                                tracing::error!(
                                    ?err,
                                    "Failed to delete expired unverified users",
                                );
                            }
                        }
                    }
                }
                Err(err) => {
                    tracing::error!(
                        ?err,
                        "Failed to query expired unverified users",
                    );
                }
            }

            tokio::time::sleep(Duration::from_hours(1)).await;
        }
    });
}
