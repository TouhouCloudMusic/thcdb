use sea_orm::DatabaseConnection;

use crate::infra::database::{get_connection, init_database};

pub fn test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL")
        .ok()
        .or_else(|| std::env::var("DATABASE_URL").ok())
        .unwrap_or_else(|| {
            let port = std::env::var("TEST_DB_PORT")
                .unwrap_or_else(|_| "55432".to_string());
            format!("postgres://testuser:testpass@127.0.0.1:{port}/testdb")
        })
}

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

pub async fn test_connection() -> DatabaseConnection {
    let conn = get_connection(&test_database_url()).await;
    init_database(&conn).await;
    conn
}
