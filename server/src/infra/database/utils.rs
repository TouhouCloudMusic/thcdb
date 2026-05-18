use std::collections::{HashMap, HashSet};
use std::future::Future;

use domain::shared::{CursorResponse, PageResponse};
use sea_orm::{
    ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Select,
};

use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::{CorrectionSortField, PageQuery, PaginationQuery};

pub async fn correction_sorted_entity_ids(
    db: &impl ConnectionTrait,
    entity_type: entity::enums::EntityType,
    sort_field: CorrectionSortField,
    sort_direction: sea_orm::Order,
) -> Result<Vec<i32>, DatabaseError> {
    use entity::correction::Column;
    let sort_column = match sort_field {
        CorrectionSortField::CreatedAt => Column::CreatedAt,
        CorrectionSortField::UpdatedAt => Column::HandledAt,
    };

    let models: Vec<entity::correction::Model> =
        entity::correction::Entity::find()
            .filter(Column::EntityType.eq(entity_type))
            .order_by(sort_column, sort_direction.clone())
            .all(db)
            .await
            .db_operation("load correction sort rows")?;

    let entity_ids = if matches!(sort_direction, sea_orm::Order::Asc) {
        // models are sorted oldest -> newest, order entities by their last occurrence.
        let mut last_index: HashMap<i32, usize> = HashMap::new();
        for (index, m) in models.iter().enumerate() {
            last_index.insert(m.entity_id, index);
        }

        let mut entries: Vec<(i32, usize)> = last_index.into_iter().collect();
        entries.sort_by_key(|(_, index)| *index);
        entries.into_iter().map(|(id, _)| id).collect()
    } else {
        // models are sorted newest -> oldest (or custom field order),
        // pick the first correction per entity.
        let mut seen = HashSet::new();
        models
            .into_iter()
            .filter_map(|m| seen.insert(m.entity_id).then_some(m.entity_id))
            .collect()
    };

    Ok(entity_ids)
}

pub fn sort_by_id_list<T>(
    mut items: Vec<T>,
    id_order: &[i32],
    get_id: impl Fn(&T) -> i32,
) -> Vec<T> {
    let id_to_index: HashMap<i32, usize> = id_order
        .iter()
        .enumerate()
        .map(|(index, &id)| (id, index))
        .collect();

    items.sort_by_key(|item| {
        id_to_index
            .get(&get_id(item))
            .copied()
            .unwrap_or(usize::MAX)
    });

    items
}

pub fn paginate_by_id<T>(
    items: Vec<T>,
    pagination: &PaginationQuery,
    get_id: impl Fn(&T) -> i32,
) -> CursorResponse<T> {
    let limit = pagination.limit() as usize;

    let items: Vec<T> = if let Some(cursor) = pagination.cursor {
        items
            .into_iter()
            .filter(|item| get_id(item) > cursor)
            .collect()
    } else {
        items
    };

    let has_next = items.len() > limit;
    let items: Vec<T> = items.into_iter().take(limit).collect();
    let next_cursor = if has_next {
        items.last().map(&get_id)
    } else {
        None
    };

    CursorResponse { items, next_cursor }
}

pub async fn find_many_paginated<E, D, Fut>(
    mut select: Select<E>,
    pagination: PaginationQuery,
    id_column: E::Column,
    fetch: impl FnOnce(Select<E>) -> Fut,
    get_id: impl Fn(&D) -> i32,
) -> Result<CursorResponse<D>, DatabaseError>
where
    E: EntityTrait,
    E::Column: ColumnTrait,
    Fut: Future<Output = Result<Vec<D>, DatabaseError>>,
{
    use sea_orm::{QueryFilter, QueryOrder, QuerySelect};

    let limit = pagination.limit();

    if let Some(cursor) = pagination.cursor {
        select = select.filter(id_column.gt(cursor));
    }

    // Ensure stable ordering for cursor pagination.
    select = select.order_by_asc(id_column);
    select = select.limit(u64::from(limit) + 1);

    let mut items = fetch(select)
        .await
        .db_operation("fetch cursor page items")?;

    let has_next = items.len() > limit as usize;
    if has_next {
        items.truncate(limit as usize);
    }

    let next_cursor = if has_next {
        items.last().map(&get_id)
    } else {
        None
    };

    Ok(CursorResponse { items, next_cursor })
}

pub async fn find_many_page<E, D, Fut>(
    db: &impl ConnectionTrait,
    mut select: Select<E>,
    pagination: PageQuery,
    id_column: E::Column,
    fetch: impl FnOnce(Select<E>) -> Fut,
) -> Result<PageResponse<D>, DatabaseError>
where
    E: EntityTrait,
    E::Model: sea_orm::FromQueryResult + Send + Sync + 'static,
    E::Column: ColumnTrait,
    Fut: Future<Output = Result<Vec<D>, DatabaseError>>,
{
    use sea_orm::{QueryOrder, QuerySelect};

    let total_items = select
        .clone()
        .count(db)
        .await
        .db_operation("count page items")?;

    // Ensure stable ordering for offset pagination.
    select = select.order_by_asc(id_column);

    select = select
        .offset(pagination.offset())
        .limit(u64::from(pagination.limit()));

    let items = fetch(select).await.db_operation("fetch page items")?;

    Ok(pagination.to_response(items, total_items))
}

pub fn page_from_items<T>(
    items: Vec<T>,
    pagination: &PageQuery,
) -> PageResponse<T> {
    let total_items = items.len() as u64;

    let start = usize::try_from(pagination.offset()).unwrap_or(usize::MAX);

    let items = if start >= items.len() {
        vec![]
    } else {
        items
            .into_iter()
            .skip(start)
            .take(usize::from(pagination.limit()))
            .collect()
    };

    pagination.to_response(items, total_items)
}
