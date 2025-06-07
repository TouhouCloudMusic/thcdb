use std::time::Duration;

use fred::prelude::ListInterface;

use super::storage::file::REMOVE_FILE_FAIELD_KEY;
use crate::utils::retry_async;

pub struct Worker {
    pub redis_pool: fred::prelude::Pool,
}

impl Worker {
    pub fn init(self) {
        init_remove_file(self.redis_pool);
    }
}

fn init_remove_file(redis_pool: fred::prelude::Pool) {
    tokio::spawn(async move {
        loop {
            match redis_pool
                .brpop::<Option<String>, _>(REMOVE_FILE_FAIELD_KEY, 0.0)
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
                                    Duration::from_millis(1000),
                                    // Well...
                                    999,
                                    async move || {
                                        pool.lpush::<String, _, _>(
                                            REMOVE_FILE_FAIELD_KEY,
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
