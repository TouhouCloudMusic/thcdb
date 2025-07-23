use ::sea_orm::{ConnectOptions, Database, DatabaseConnection};
use sea_orm_migration::MigratorTrait;

use self::sea_orm::enum_table::sync_enum_table;

pub mod error;
pub mod sea_orm;

pub async fn get_connection(url: &str) -> DatabaseConnection {
    let opt = ConnectOptions::new(url)
        .sqlx_logging(false)
        .min_connections(1)
        .to_owned();

    let conn = Database::connect(opt).await.unwrap();

    migration::Migrator::up(&conn, None)
        .await
        .inspect_err(|x| println!("Failed to run migration:\n{x}"))
        .unwrap();

    sync_enum_table(&conn)
        .await
        .expect("Failed to sync enum tables");

    conn
}
