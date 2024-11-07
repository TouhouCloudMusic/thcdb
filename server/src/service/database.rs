use std::env;

use sea_orm::{ConnectOptions, Database, DatabaseConnection};

pub async fn get_db_connection() -> DatabaseConnection {
    let db_url = env::var("DATABASE_URL").unwrap();

    let opt = ConnectOptions::new(db_url)
        .sqlx_logging(false)
        .min_connections(1)
        .to_owned();

    Database::connect(opt).await.unwrap()
}
