use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde_json::{Map, Value};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::{self, Data};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain::Connection;
use crate::domain::correction::CorrectionDiff;
use crate::feature::correction::shared::repo as correction_diff;
use crate::infra::error::Error;

use entity::enums::CorrectionStatus;
use entity::{correction as correction_entity, correction_revision};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(get_correction_diff)))
        .finish()
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
    CurrentUser(_user): CurrentUser,
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDiff>, impl IntoResponse> {
    let Some(current) = correction_entity::Entity::find_by_id(id)
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

    let current_revision = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id))
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

    let mut base_query = correction_entity::Entity::find()
        .filter(correction_entity::Column::EntityId.eq(current.entity_id))
        .filter(correction_entity::Column::EntityType.eq(current.entity_type))
        .filter(
            correction_entity::Column::Status.eq(CorrectionStatus::Approved),
        )
        .filter(correction_entity::Column::Id.ne(current.id));

    if let Some(handled_at) = current.handled_at {
        base_query = base_query
            .filter(correction_entity::Column::HandledAt.lt(handled_at));
    }

    let base = base_query
        .order_by_desc(correction_entity::Column::HandledAt)
        .order_by_desc(correction_entity::Column::CreatedAt)
        .order_by_desc(correction_entity::Column::Id)
        .one(repo.conn())
        .await
        .map_err(Error::from)
        .map_err(IntoResponse::into_response)?;

    let (base_snapshot, base_correction_id, base_history_id) =
        if let Some(base) = base {
            let base_revision = correction_revision::Entity::find()
                .filter(correction_revision::Column::CorrectionId.eq(base.id))
                .order_by_desc(correction_revision::Column::EntityHistoryId)
                .one(repo.conn())
                .await
                .map_err(Error::from)
                .map_err(IntoResponse::into_response)?
                .ok_or_else(|| {
                    api_response::Error::new((
                        "Base correction revision not found",
                        StatusCode::NOT_FOUND,
                    ))
                })
                .map_err(IntoResponse::into_response)?;

            let snapshot = correction_diff::snapshot_for_history(
                repo.conn(),
                current.entity_type,
                base_revision.entity_history_id,
            )
            .await
            .map_err(Error::from)
            .map_err(IntoResponse::into_response)?;

            (
                snapshot,
                Some(base.id),
                Some(base_revision.entity_history_id),
            )
        } else {
            (Value::Object(Map::default()), None, None)
        };

    let target_snapshot = correction_diff::snapshot_for_history(
        repo.conn(),
        current.entity_type,
        current_revision.entity_history_id,
    )
    .await
    .map_err(Error::from)
    .map_err(IntoResponse::into_response)?;

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
