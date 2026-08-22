#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] infra_db::error::DatabaseError),
    #[display("Notification not found")]
    NotFound,
    #[display("{_0}")]
    BadRequest(#[error(ignore)] &'static str),
}
