use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::{self, Data};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain::Connection;
use crate::domain::correction::CorrectionDiff;
use crate::feature::correction::shared::repo as correction_diff;
use crate::infra::error::Error;

use entity::{correction as correction_entity, correction_revision};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

#[derive(Deserialize, IntoParams)]
struct CompareCorrectionPath {
    id1: i32,
    id2: i32,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(compare_corrections)))
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
    CurrentUser(_user): CurrentUser,
    Path(CompareCorrectionPath { id1, id2 }): Path<CompareCorrectionPath>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDiff>, impl IntoResponse> {
    let Some(left) = correction_entity::Entity::find_by_id(id1)
        .one(repo.conn())
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?
    else {
        return Err(api_response::Error::new((
            "Correction not found",
            StatusCode::NOT_FOUND,
        ))
        .into_response());
    };

    let Some(right) = correction_entity::Entity::find_by_id(id2)
        .one(repo.conn())
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?
    else {
        return Err(api_response::Error::new((
            "Correction not found",
            StatusCode::NOT_FOUND,
        ))
        .into_response());
    };

    if left.entity_id != right.entity_id
        || left.entity_type != right.entity_type
    {
        return Err(api_response::Error::new((
            "Corrections must target the same entity",
            StatusCode::BAD_REQUEST,
        ))
        .into_response());
    }

    let left_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id1))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(repo.conn())
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| {
            api_response::Error::new((
                "Correction revision not found",
                StatusCode::NOT_FOUND,
            ))
        })
        .map_err(IntoResponse::into_response)?;

    let right_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id2))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .one(repo.conn())
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?
        .ok_or_else(|| {
            api_response::Error::new((
                "Correction revision not found",
                StatusCode::NOT_FOUND,
            ))
        })
        .map_err(IntoResponse::into_response)?;

    let left_snapshot = correction_diff::snapshot_for_history(
        repo.conn(),
        left.entity_type,
        left_revision.entity_history_id,
    )
    .await
    .map_err(Error::from)
    .map_err(IntoResponse::into_response)?;

    let right_snapshot = correction_diff::snapshot_for_history(
        repo.conn(),
        right.entity_type,
        right_revision.entity_history_id,
    )
    .await
    .map_err(Error::from)
    .map_err(IntoResponse::into_response)?;

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
