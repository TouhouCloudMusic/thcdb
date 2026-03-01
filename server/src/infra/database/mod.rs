use std::collections::HashSet;
use std::sync::LazyLock;

use ::sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;
use tokio::sync::Mutex;

use self::sea_orm::enum_table::sync_enum_table;

pub mod error;
pub mod sea_orm;

static INITIALIZED_DATABASES: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

pub async fn get_connection(url: &str) -> DatabaseConnection {
    let opt = ConnectOptions::new(url)
        .sqlx_logging(false)
        .min_connections(1)
        .to_owned();

    let conn = Database::connect(opt).await.unwrap();

    let mut initialized_databases = INITIALIZED_DATABASES.lock().await;
    if !initialized_databases.contains(url) {
        migration::Migrator::up(&conn, None)
            .await
            .inspect_err(|x| println!("Failed to run migration:\n{x}"))
            .unwrap();

        sync_enum_table(&conn)
            .await
            .expect("Failed to sync enum tables");

        initialized_databases.insert(url.to_string());
    }

    conn
}
