use axum::extract::{Path, State};
use serde_json::{Map, Value};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::features::correction::shared::repo as correction_diff;
use crate::features::correction::{CorrectionDiff, ReadError};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::Data;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_correction_diff)))
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
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDiff>, ReadError> {
    let Some(current) = correction_core::find_by_id(&repo.conn, id)
        .await
        .db_context("find correction for diff")?
    else {
        return Err(ReadError::NotFound("Correction not found"));
    };

    let current_revision = correction_core::latest_revision(&repo.conn, id)
        .await
        .db_context("find current correction revision for diff")?
        .ok_or(ReadError::NotFound("Correction revision not found"))?;

    let base = correction_core::find_base(&repo.conn, &current)
        .await
        .db_context("find base correction for diff")?;

    let (base_snapshot, base_correction_id, base_history_id) =
        if let Some(base) = base {
            let base_revision =
                correction_core::latest_revision(&repo.conn, base.id)
                    .await
                    .db_context("find base correction revision for diff")?
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
