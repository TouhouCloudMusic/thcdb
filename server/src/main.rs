use axum::{routing::get, Router};
use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection};
use std::env;

#[tokio::main]
async fn main() {
    // build our application with a single route
    let app = Router::new().route("/", get(|| async { "Hello, World!" }));

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn get_db_connectin(
) -> Result<DatabaseConnection, Box<dyn std::error::Error>> {
    dotenvy::dotenv()?;

    let db_url = env::var("DATABASE_URL")?;

    let connection: DatabaseConnection = Database::connect(db_url).await?;

    Migrator::up(&connection, None).await?;

    Ok(connection)
}
