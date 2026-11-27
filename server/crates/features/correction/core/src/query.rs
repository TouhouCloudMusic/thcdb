use std::collections::{HashMap, HashSet};

use entity::correction::{Column, Entity, Model};
use entity::enums::{CorrectionStatus, EntityType};
use infra_db::error::{
    BrokenEntityReference, DatabaseFailure, DatabaseResultExt,
};
use sea_orm::sea_query::NullOrdering;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, DbErr, EntityTrait, Order,
    QueryFilter, QueryOrder,
};

use crate::latest_revision;

pub enum CorrectionSortField {
    CreatedAt,
    HandledAt,
}

pub async fn correction_sorted_entity_ids(
    db: &impl ConnectionTrait,
    entity_type: EntityType,
    sort_field: CorrectionSortField,
    sort_direction: Order,
) -> Result<Vec<i32>, DatabaseFailure> {
    let sort_column = match sort_field {
        CorrectionSortField::CreatedAt => Column::CreatedAt,
        CorrectionSortField::HandledAt => Column::HandledAt,
    };

    let models: Vec<Model> = Entity::find()
        .filter(Column::EntityType.eq(entity_type))
        .order_by(sort_column, sort_direction.clone())
        .all(db)
        .await
        .db_context("load correction sort rows")?;

    let entity_ids = if matches!(sort_direction, Order::Asc) {
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

pub async fn find_pending_history_id(
    db: &impl ConnectionTrait,
    entity_id: i32,
    entity_type: EntityType,
    correction_id: i32,
) -> Result<Option<i32>, DatabaseFailure> {
    let Some(correction) = Entity::find()
        .filter(Column::Id.eq(correction_id))
        .filter(Column::EntityId.eq(entity_id))
        .filter(Column::EntityType.eq(entity_type))
        .filter(Column::Status.eq(CorrectionStatus::Pending))
        .one(db)
        .await
        .db_context("find pending correction")?
    else {
        return Ok(None);
    };

    latest_revision(db, correction.id)
        .await
        .db_context("find latest pending correction revision")?
        .map(|revision| revision.entity_history_id)
        .ok_or_else(|| {
            BrokenEntityReference {
                entity: "correction revision",
                id: correction.id,
            }
            .into()
        })
        .map(Some)
}

pub async fn find_correction(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<Option<Model>, DbErr> {
    Entity::find_by_id(correction_id).one(conn).await
}

pub async fn correction_exists(
    conn: &impl ConnectionTrait,
    correction_id: i32,
) -> Result<bool, DbErr> {
    infra_db::trace("correction.exists", async {
        Ok(find_correction(conn, correction_id).await?.is_some())
    })
    .await
}

pub async fn find_by_id(
    db: &impl ConnectionTrait,
    id: i32,
) -> Result<Option<Model>, DbErr> {
    infra_db::trace("correction.find_by_id", find_correction(db, id)).await
}

pub async fn find_base(
    db: &impl ConnectionTrait,
    current: &Model,
) -> Result<Option<Model>, DbErr> {
    infra_db::trace("correction.find_base", async {
        let mut query = Entity::find()
            .filter(Column::EntityId.eq(current.entity_id))
            .filter(Column::EntityType.eq(current.entity_type))
            .filter(Column::Status.eq(CorrectionStatus::Approved))
            .filter(Column::Id.ne(current.id));
        if let Some(handled_at) = current.handled_at {
            query = query.filter(
                Condition::any().add(Column::HandledAt.lt(handled_at)).add(
                    Column::HandledAt
                        .is_null()
                        .and(Column::CreatedAt.lt(current.created_at)),
                ),
            );
        }
        query
            .order_by_with_nulls(
                Column::HandledAt,
                Order::Desc,
                NullOrdering::Last,
            )
            .order_by_desc(Column::CreatedAt)
            .order_by_desc(Column::Id)
            .one(db)
            .await
    })
    .await
}

pub async fn list_approved_corrections(
    conn: &impl ConnectionTrait,
    entity_type: EntityType,
    entity_id: i32,
) -> Result<Vec<Model>, DbErr> {
    Entity::find()
        .filter(Column::EntityId.eq(entity_id))
        .filter(Column::EntityType.eq(entity_type))
        .filter(Column::Status.eq(CorrectionStatus::Approved))
        .order_by_desc(Column::HandledAt)
        .order_by_desc(Column::CreatedAt)
        .all(conn)
        .await
}
