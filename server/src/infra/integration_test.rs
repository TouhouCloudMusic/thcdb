use sea_orm::DatabaseConnection;

use crate::features::auth::sync_startup_data;

pub(crate) mod fixture;

pub fn test_redis_url() -> String {
    std::env::var("TEST_REDIS_URL")
        .ok()
        .or_else(|| std::env::var("REDIS_URL").ok())
        .unwrap_or_else(|| {
            let port = std::env::var("TEST_REDIS_PORT")
                .unwrap_or_else(|_| "56379".to_string());
            format!("redis://127.0.0.1:{port}")
        })
}

pub async fn test_connection() -> anyhow::Result<DatabaseConnection> {
    static STARTUP_DATA: tokio::sync::OnceCell<()> =
        tokio::sync::OnceCell::const_new();
    let conn = infra_testing::test_connection().await;
    STARTUP_DATA
        .get_or_try_init(|| async { sync_startup_data(&conn).await })
        .await?;
    Ok(conn)
}
