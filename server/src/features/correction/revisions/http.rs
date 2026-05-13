use std::collections::HashMap;

use axum::extract::{Path, State};
use entity::{correction as correction_entity, correction_revision, user};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder};
use serde::Serialize;
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::infra::database::error::DatabaseResultExt;
use crate::shared::http::api_response::{AppError, Data};

#[derive(Clone, Serialize, ToSchema)]
struct CorrectionUserSummary {
    id: i32,
    name: String,
}

#[derive(Serialize, ToSchema)]
struct CorrectionRevisionSummary {
    entity_history_id: i32,
    author: CorrectionUserSummary,
    description: String,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_correction_revisions)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id}/revisions",
    responses(
        (status = 200, body = Data<Vec<CorrectionRevisionSummary>>),
    ),
)]
async fn get_correction_revisions(
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Vec<CorrectionRevisionSummary>>, AppError> {
    let exists = correction_entity::Entity::find_by_id(id)
        .one(&repo.conn)
        .await
        .db_operation("find correction for revisions")?;

    if exists.is_none() {
        return Err(AppError::not_found("Correction not found"));
    }

    let revisions = correction_revision::Entity::find()
        .filter(correction_revision::Column::CorrectionId.eq(id))
        .order_by_desc(correction_revision::Column::EntityHistoryId)
        .all(&repo.conn)
        .await
        .db_operation("find correction revisions")?;

    let author_ids = revisions
        .iter()
        .map(|revision| revision.author_id)
        .collect::<Vec<_>>();

    let authors = if author_ids.is_empty() {
        Vec::new()
    } else {
        user::Entity::find()
            .filter(user::Column::Id.is_in(author_ids))
            .all(&repo.conn)
            .await
            .db_operation("find correction revision authors")?
    };

    let author_map = authors
        .into_iter()
        .map(|author| {
            (
                author.id,
                CorrectionUserSummary {
                    id: author.id,
                    name: author.name,
                },
            )
        })
        .collect::<HashMap<_, _>>();

    let summaries = revisions
        .into_iter()
        .map(|revision| {
            let author = author_map
                .get(&revision.author_id)
                .cloned()
                .unwrap_or_else(|| CorrectionUserSummary {
                    id: revision.author_id,
                    name: "Unknown".to_string(),
                });
            CorrectionRevisionSummary {
                entity_history_id: revision.entity_history_id,
                author,
                description: revision.description,
            }
        })
        .collect::<Vec<_>>();

    Ok(Data::from(summaries))
}
