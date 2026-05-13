use axum::extract::{Path, State};
use entity::enums::CorrectionStatus;
use entity::{correction as correction_entity, correction_revision};
use sea_orm::sea_query::NullOrdering;
use sea_orm::{
    ColumnTrait, Condition, ConnectionTrait, EntityTrait, Order, QueryFilter,
    QueryOrder,
};
use serde_json::{Map, Value};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::domain::correction::CorrectionDiff;
use crate::features::correction::ReadError;
use crate::features::correction::shared::repo as correction_diff;
use crate::infra::database::error::{DatabaseError, DatabaseResultExt};
use crate::shared::http::api_response::Data;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_correction_diff)))
        .finish()
}

async fn find_base_correction(
    db: &impl ConnectionTrait,
    current: &correction_entity::Model,
) -> Result<Option<correction_entity::Model>, DatabaseError> {
    let mut query = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(current.entity_id))
        .filter(correction_entity::Column::EntityType.eq(current.entity_type))
        .filter(
            correction_entity::Column::Status.eq(CorrectionStatus::Approved),
        )
        .filter(correction_entity::Column::Id.ne(current.id));

    if let Some(handled_at) = current.handled_at {
        query = query.filter(
            Condition::any()
                .add(correction_entity::Column::HandledAt.lt(handled_at))
                .add(correction_entity::Column::HandledAt.is_null().and(
                    correction_entity::Column::CreatedAt.lt(current.created_at),
                )),
        );
    }

    query
        .order_by_with_nulls(
            correction_entity::Column::HandledAt,
            Order::Desc,
            NullOrdering::Last,
        )
        .order_by_desc(correction_entity::Column::CreatedAt)
        .order_by_desc(correction_entity::Column::Id)
        .one(db)
        .await
        .db_operation("find base correction for diff")
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id}/diff",
    responses(
        (status = 200, body = Data<CorrectionDiff>),
    ),
)]
async fn get_correction_diff(
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDiff>, ReadError> {
    let Some(current) = correction_entity::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .db_operation("find correction for diff")?
    else {
        return Err(ReadError::NotFound("Correction not found"));
    };

    let current_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(&repo.conn)
        .await
        .db_operation("find current correction revision for diff")?
        .ok_or(ReadError::NotFound("Correction revision not found"))?;

    let base = find_base_correction(&repo.conn, &current).await?;

    let (base_snapshot, base_correction_id, base_history_id) =
        if let Some(base) = base {
            let base_revision = correction_revision::Entity::find()
                .filter(correction_revision::Column::CorrectionId.eq(base.id))
                .order_by_desc(correction_revision::Column::EntityHistoryId)
                .one(&repo.conn)
                .await
                .db_operation("find base correction revision for diff")?
                .ok_or(ReadError::NotFound(
                    "Base correction revision not found",
                ))?;

            let snapshot = correction_diff::snapshot_for_history(
                &repo.conn,
                current.entity_type,
                base_revision.entity_history_id,
            )
            .await?;

            (
                snapshot,
                Some(base.id),
                Some(base_revision.entity_history_id),
            )
        } else {
            (Value::Object(Map::default()), None, None)
        };

    let target_snapshot = correction_diff::snapshot_for_history(
        &repo.conn,
        current.entity_type,
        current_revision.entity_history_id,
    )
    .await?;

    let changes =
        correction_diff::diff_snapshots(&base_snapshot, &target_snapshot);

    Ok(Data::from(CorrectionDiff {
        entity_id: current.entity_id,
        entity_type: current.entity_type,
        base_correction_id,
        base_history_id,
        target_correction_id: current.id,
        target_history_id: current_revision.entity_history_id,
        changes,
    }))
}
