use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;
use visit_core::EntityType;

use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::{ArcAppState, AuthSession};
use crate::features::{artist, release};
use crate::shared::http::api_response::AppError;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(record_visit)))
        .finish()
}

#[derive(Deserialize, IntoParams)]
struct VisitPath {
    #[param(inline)]
    entity_type: EntityType,
    id: i32,
}

#[utoipa::path(
    post,
    path = "/{entity_type}/{id}/visit",
    tag = "Visit",
    params(VisitPath),
    responses(
        (status = 204, description = "Visit recorded"),
        (status = 404, description = "Entity not found"),
    ),
)]
async fn record_visit(
    State(state): State<ArcAppState>,
    session: AuthSession,
    Path(VisitPath { entity_type, id }): Path<VisitPath>,
) -> Result<StatusCode, AppError> {
    let exists = match entity_type {
        EntityType::Release => {
            release::find::repo::exists(&state.database, id).await
        }
        EntityType::Artist => {
            artist::find::repo::exists(&state.database, id).await
        }
    }
    .map_err(AppError::internal)?;

    if !exists {
        return Err(AppError::not_found("Entity not found"));
    }

    let visitor = if let Some(visitor) = session
        .session
        .get::<String>("entity_visitor")
        .await
        .map_err(AppError::internal)?
    {
        visitor
    } else {
        let visitor = format!("{:032x}", rand::random::<u128>());
        session
            .session
            .insert("entity_visitor", &visitor)
            .await
            .map_err(AppError::internal)?;
        visitor
    };

    visit_core::record(
        &state.redis_pool(),
        entity_type,
        id,
        &visitor,
        chrono::Utc::now().date_naive(),
    )
    .await
    .map_err(AppError::internal)?;

    Ok(StatusCode::NO_CONTENT)
}
