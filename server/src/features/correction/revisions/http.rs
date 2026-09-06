use axum::extract::{FromRef, Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::CorrectionRevisionSummary;
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
    State(service): State<Service>,
) -> Result<Data<Vec<CorrectionRevisionSummary>>, ReadError> {
    let Some(summaries) = service.list_revisions(id).await? else {
        return Err(ReadError::NotFound("Correction not found"));
    };

    Ok(Data::from(summaries))
}
