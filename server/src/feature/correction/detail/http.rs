use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::{self, Data};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::domain::Connection;
use crate::domain::correction::Correction;
use crate::infra::error::Error;

use entity::correction as correction_entity;
use sea_orm::EntityTrait;

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(get_correction)))
        .finish()
}

#[utoipa::path(
    get,
    tag = "Correction",
    path = "/correction/{id}",
    responses(
        (status = 200, body = Data<Correction>),
    ),
)]
async fn get_correction(
    CurrentUser(_user): CurrentUser,
    Path(id): Path<i32>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<Correction>, impl IntoResponse> {
    let Some(model) = correction_entity::Entity::find_by_id(id)
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

    Ok(Data::from(Correction::from(model)))
}
