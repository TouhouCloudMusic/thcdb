use ::sea_orm::{ConnectOptions, Database, DatabaseConnection};

pub mod sea_orm;
pub use sea_orm::enum_table::check_database_lookup_tables;
pub mod error;

pub async fn get_connection(url: &str) -> DatabaseConnection {
    let opt = ConnectOptions::new(url)
        .sqlx_logging(false)
        .min_connections(1)
        .to_owned();

    Database::connect(opt).await.unwrap()
}
