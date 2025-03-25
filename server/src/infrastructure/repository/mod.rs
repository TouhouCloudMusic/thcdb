pub mod image;

#[derive(Clone)]
pub struct SeaOrmRepository {
    conn: sea_orm::DatabaseConnection,
}

impl SeaOrmRepository {
    pub const fn new(conn: sea_orm::DatabaseConnection) -> Self {
        Self { conn }
    }
}
