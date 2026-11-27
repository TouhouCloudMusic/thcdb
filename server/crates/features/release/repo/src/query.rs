use entity::release;
use entity::sea_orm_active_enums::ReleaseType;
use infra_db::error::{DatabaseError, DatabaseResultExt};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, Order, PaginatorTrait,
    QueryFilter, QueryOrder, QuerySelect, Select,
};
use sea_query::NullOrdering;

use crate::{ReleaseListItem, load_list};

fn filter_release_types(
    select: Select<release::Entity>,
    release_types: Option<Vec<ReleaseType>>,
) -> Select<release::Entity> {
    match release_types {
        Some(release_types) => {
            select.filter(release::Column::ReleaseType.is_in(release_types))
        }
        None => select,
    }
}

#[infra_db::observe("database.load_page")]
pub async fn find_list_page(
    db: &impl ConnectionTrait,
    release_types: Option<Vec<ReleaseType>>,
    release_date_order: Option<Order>,
    offset: u64,
    limit: u8,
) -> Result<(Vec<ReleaseListItem>, u64), DatabaseError> {
    let mut select =
        filter_release_types(release::Entity::find(), release_types);
    if let Some(order) = release_date_order {
        select = select.order_by_with_nulls(
            release::Column::ReleaseDate,
            order,
            NullOrdering::Last,
        );
    }

    let total_items = select
        .clone()
        .count(db)
        .await
        .db_context("count page items")?;

    // Ensure stable ordering for offset pagination.
    let select = select
        .order_by_asc(release::Column::Id)
        .offset(offset)
        .limit(u64::from(limit));
    let items = load_list(select, db)
        .await
        .db_context("load releases")
        .db_context("fetch page items")?;

    Ok((items, total_items))
}

/// Fetches release list items for the given IDs. The caller applies its ID order.
pub async fn find_list_by_ids(
    db: &impl ConnectionTrait,
    release_types: Option<Vec<ReleaseType>>,
    entity_ids: &[i32],
) -> Result<Vec<ReleaseListItem>, DatabaseError> {
    if entity_ids.is_empty() {
        return Ok(vec![]);
    }

    let select = release::Entity::find()
        .filter(release::Column::Id.is_in(entity_ids.iter().copied()));
    let select = filter_release_types(select, release_types);

    load_list(select, db).await.db_context("load releases")
}
