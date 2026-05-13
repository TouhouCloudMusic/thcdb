use axum::extract::{Path, State};
use entity::{correction as correction_entity, correction_revision};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::domain::correction::CorrectionDiff;
use crate::features::correction::shared::repo as correction_diff;
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data};

#[derive(Deserialize, IntoParams)]
struct CompareCorrectionPath {
    id1: i32,
    id2: i32,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(compare_corrections)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id1}/compare/{id2}",
    params(CompareCorrectionPath),
    responses(
        (status = 200, body = Data<CorrectionDiff>),
    ),
)]
async fn compare_corrections(
    Path(CompareCorrectionPath { id1, id2 }): Path<CompareCorrectionPath>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDiff>, AppError> {
    let Some(left) = correction_entity::Entity::find_by_id(id1)
        .one(&repo.conn)
        .await
        .db_operation("find left correction for comparison")?
    else {
        return Err(AppError::not_found("Correction not found"));
    };

    let Some(right) = correction_entity::Entity::find_by_id(id2)
        .one(&repo.conn)
        .await
        .db_operation("find right correction for comparison")?
    else {
        return Err(AppError::not_found("Correction not found"));
    };

    if left.entity_id != right.entity_id
        || left.entity_type != right.entity_type
    {
        return Err(AppError::bad_request(
            "Corrections must target the same entity",
        ));
    }

    let left_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id1))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(&repo.conn)
        .await
        .db_operation("find left correction revision for comparison")?
        .ok_or_else(|| AppError::not_found("Correction revision not found"))?;

    let right_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id2))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(&repo.conn)
        .await
        .db_operation("find right correction revision for comparison")?
        .ok_or_else(|| AppError::not_found("Correction revision not found"))?;

    let left_snapshot = correction_diff::snapshot_for_history(
        &repo.conn,
        left.entity_type,
        left_revision.entity_history_id,
    )
    .await?;

    let right_snapshot = correction_diff::snapshot_for_history(
        &repo.conn,
        right.entity_type,
        right_revision.entity_history_id,
    )
    .await?;

    let changes =
        correction_diff::diff_snapshots(&left_snapshot, &right_snapshot);

    Ok(Data::from(CorrectionDiff {
        entity_id: left.entity_id,
        entity_type: left.entity_type,
        base_correction_id: Some(left.id),
        base_history_id: Some(left_revision.entity_history_id),
        target_correction_id: right.id,
        target_history_id: right_revision.entity_history_id,
        changes,
    }))
}
