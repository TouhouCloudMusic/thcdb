use ::sea_orm::DatabaseConnection;
use tokio::sync::OnceCell;

use crate::features::auth::sync_startup_data;

pub(crate) mod cache;
pub mod error;
pub mod utils;

pub use infra_db::{get_connection, run_migrations};

static DATABASE_INIT: OnceCell<()> = OnceCell::const_new();

pub async fn init_database(conn: &DatabaseConnection) {
    let conn = conn.clone();
    DATABASE_INIT
        .get_or_init(|| async {
            run_migrations(&conn).await;

            sync_startup_data(&conn)
                .await
                .expect("Failed to sync startup data");
        })
        .await;
}
