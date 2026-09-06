use axum::extract::{FromRef, Path, State};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::CorrectionDetail;
use super::service::Service;
use crate::adapter::inbound::rest::state::{ArcAppState, AuthSession};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::correction::ReadError;
use crate::shared::http::api_response::Data;

impl FromRef<ArcAppState> for Service {
    fn from_ref(input: &ArcAppState) -> Self {
        Self::new(input.sea_orm_repo.clone())
    }
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_public(|r| r.routes(routes!(get_correction)))
        .finish()
}

data!(DataCorrectionDetail, CorrectionDetail);

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id}",
    responses(
        (status = 200, body = DataCorrectionDetail),
    ),
)]
async fn get_correction(
    session: AuthSession,
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Data<CorrectionDetail>, ReadError> {
    let result = service
        .find_correction(id, session.user.as_ref().map(|user| user.id))
        .await?;

    result
        .ok_or(ReadError::NotFound("Correction not found"))
        .map(Data::from)
}
