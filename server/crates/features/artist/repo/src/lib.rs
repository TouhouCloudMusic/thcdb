pub mod credits;
pub mod find;
mod history;
pub mod list;
pub mod model;
mod read_model;
mod reference;
pub mod releases;
pub mod write;

use entity::artist;
pub use history::{apply_history, load_history_snapshot};
use infra_db::error::DatabaseError;
pub use reference::ArtistReferenceRow;
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QuerySelect,
};

#[infra_db::observe("artist.exists")]
pub async fn exists(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<bool, DatabaseError> {
    let count = artist::Entity::find()
        .select_only()
        .expr(1)
        .filter(artist::Column::Id.eq(id))
        .count(db)
        .await?;
    Ok(count > 0)
}
