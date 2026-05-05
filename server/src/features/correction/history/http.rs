use axum::extract::{FromRef, Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::{CorrectionHistoryItem, EntityCorrectionsPath};
use super::service::Service;
use crate::adapter::inbound::rest::AppRouter;
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::features::correction::ReadError;
use crate::shared::http::api_response::Data;

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(entity_corrections)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/{entity_type}/{id}/corrections",
    params(EntityCorrectionsPath),
    responses(
        (status = 200, body = Data<Vec<CorrectionHistoryItem>>),
    ),
)]
async fn entity_corrections(
    Path(EntityCorrectionsPath { entity_type, id }): Path<
        EntityCorrectionsPath,
    >,
    State(service): State<Service>,
) -> Result<Data<Vec<CorrectionHistoryItem>>, ReadError> {
    let entity_type = entity::enums::EntityType::from(entity_type);
    let items = service.list_entity_corrections(entity_type, id).await?;

    Ok(Data::from(items))
}
