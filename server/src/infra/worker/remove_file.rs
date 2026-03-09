use std::time::Duration;

use fred::prelude::{Client, ClientLike, ListInterface, Options};

use super::Worker;
use crate::infra::storage::file::REMOVE_FILE_FAILED_KEY;
use crate::utils::retry_async;

pub(super) fn init(worker: &Worker) {
    let redis_pool = worker.redis_pool.clone();
    let client = Client::clone_new(redis_pool.next()).with_options(&Options {
        timeout: Duration::from_secs(0).into(),
        ..Default::default()
    });

    tokio::spawn(async move {
        client.init().await.unwrap();
        tracing::info!("File removal worker started");
        loop {
            match client
                .brpop::<Option<(String, String)>, _>(
                    REMOVE_FILE_FAILED_KEY,
                    0.0,
                )
                .await
            {
                Ok(Some((_queue_key, path))) => {
                    tracing::info!("Deleting file: {}", path);
                    if let Err(err) = tokio::fs::remove_file(&path).await {
                        if err.kind() != std::io::ErrorKind::NotFound {
                            tracing::error!(
                                "Failed to delete {}: {}",
                                path,
                                err
                            );
                            let pool = redis_pool.clone();
                            tokio::spawn(async move {
                                retry_async(
                                    Duration::from_secs(1),
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
                Err(err) => {
                    tracing::error!("Redis error: {:?}", err);
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use fred::types::Value;

    use super::*;

    #[test]
    fn brpop_reply_converts_to_queue_and_path() {
        let path = "/tmp/example".to_string();
        let reply = Value::Array(vec![
            REMOVE_FILE_FAILED_KEY.into(),
            path.clone().into(),
        ]);

        let reply: Option<(String, String)> = reply.convert().unwrap();

        assert_eq!(reply, Some((REMOVE_FILE_FAILED_KEY.to_string(), path)));
    }
}
