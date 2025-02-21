use entity::release;
use sea_orm::{ConnectionTrait, EntityName, EntityTrait, PaginatorTrait};

use crate::error::RepositoryError;

pub async fn check_existence(
    id: i32,
    db: &impl ConnectionTrait,
) -> Result<(), RepositoryError> {
    let count = release::Entity::find_by_id(id).count(db).await?;

    if count > 0 {
        Ok(())
    } else {
        Err(RepositoryError::EntityNotFound {
            entity_name: release::Entity.table_name(),
        })
    }
}
