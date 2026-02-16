use std::time::Duration;

use chrono::Utc;
use fred::prelude::{Client, ClientLike, ListInterface, Options};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QuerySelect};

use super::storage::file::REMOVE_FILE_FAILED_KEY;
use crate::infra::database::sea_orm::SeaOrmRepository;
use crate::utils::retry_async;

pub struct Worker {
    pub redis_pool: fred::prelude::Pool,
    pub repo: SeaOrmRepository,
    pub notification_retention_days: i64,
}

impl Worker {
    pub fn init(self) {
        let repo = self.repo;
        init_remove_file(self.redis_pool);
        init_notification_cleanup(
            repo.clone(),
            self.notification_retention_days,
        );
        init_unverified_user_cleanup(repo);
    }
}

fn init_remove_file(redis_pool: fred::prelude::Pool) {
    let client = Client::clone_new(redis_pool.next()).with_options(&Options {
        timeout: Duration::from_secs(0).into(),
        ..Default::default()
    });

    tokio::spawn(async move {
        client.init().await.unwrap();
        tracing::info!("File removal worker started");
        loop {
            match client
                .brpop::<Option<String>, _>(REMOVE_FILE_FAILED_KEY, 0.0)
                .await
            {
                Ok(Some(path)) => {
                    tracing::info!("Deleting file: {}", path);
                    if let Err(e) = tokio::fs::remove_file(&path).await {
                        // Ignore not found
                        if e.kind() != std::io::ErrorKind::NotFound {
                            tracing::error!("Failed to delete {}: {}", path, e);
                            let pool = redis_pool.clone();
                            tokio::spawn(async move {
                                retry_async(
                                    Duration::from_secs(1),
                                    // Well...
                                    999,
                                    async move || {
                                        pool.lpush::<String, _, _>(
                                            REMOVE_FILE_FAILED_KEY,
                                            path.clone(),
                                        )
                                        .await
                                    },
                                )
                                .await
                            });
                        }
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    tracing::error!("Redis error: {:?}", e);
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });
}

fn init_notification_cleanup(repo: SeaOrmRepository, retention_days: i64) {
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

fn init_unverified_user_cleanup(repo: SeaOrmRepository) {
    tokio::spawn(async move {
        tracing::info!("Unverified user cleanup worker started");

        loop {
            let cutoff: chrono::DateTime<chrono::FixedOffset> =
                (Utc::now() - chrono::Duration::hours(24)).into();

            // TODO: move to repo layer
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
