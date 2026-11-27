mod model;
mod repo;

use infra_db::error::DatabaseError;
use infra_error::EntityNotFound;
pub use model::{EntityType, Score, TagAggregate, TagAggregateVote};
pub use repo::{delete, get_tags, upsert};

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
pub enum Error {
    #[display("{_0}")]
    NotFound(#[error(source)] EntityNotFound),
    #[display("{_0}")]
    #[from]
    Database(#[error(source)] DatabaseError),
}
