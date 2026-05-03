use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use entity::correction as correction_entity;
use sea_orm::EntityTrait;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use super::model::CorrectionDetail;
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, data};
use crate::features::correction::comment;
use crate::infra::error::Error;
use crate::shared::http::api_response::{self, Data};

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
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Data<CorrectionDetail>, axum::response::Response> {
    let Some(model) = correction_entity::Entity::find_by_id(id)
        .one(&repo.conn)
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

    let comments = comment::initial_page(&repo.conn, id)
        .await
        .map_err(IntoResponse::into_response)?;

    Ok(Data::from(CorrectionDetail {
        id: model.id,
        status: model.status,
        r#type: model.r#type,
        entity_id: model.entity_id,
        entity_type: model.entity_type,
        created_at: model.created_at,
        handled_at: model.handled_at,
        comments,
    }))
}
