use axum::extract::{FromRef, Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::CorrectionDetail;
use super::service::{FindCorrectionDetailResult, Service};
use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::shared::http::api_response::{self, Data};

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
    Path(id): Path<i32>,
    State(service): State<Service>,
) -> Result<Data<CorrectionDetail>, axum::response::Response> {
    let result = service
        .find_correction(id)
        .await
        .map_err(IntoResponse::into_response)?;

    match result {
        FindCorrectionDetailResult::Found(detail) => Ok(Data::from(detail)),
        FindCorrectionDetailResult::CorrectionNotFound => {
            Err(api_response::Error::new((
                "Correction not found",
                StatusCode::NOT_FOUND,
            ))
            .into_response())
        }
    }
}
