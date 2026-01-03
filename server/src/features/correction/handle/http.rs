use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::api_response::{self, Message};
use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser};
use crate::features::correction::model::HandleCorrectionMethod;
use crate::features::correction::service;

#[derive(IntoParams, Deserialize)]
struct HandleCorrectionQuery {
    method: HandleCorrectionMethod,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(handle_correction)))
        .finish()
}

#[utoipa::path(
    post,
    tag = "Correction",
    path = "/correction/{id}",
    params(
        HandleCorrectionQuery
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn handle_correction(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<HandleCorrectionQuery>,
    State(repo): State<state::SeaOrmRepository>,
) -> Result<Message, impl IntoResponse> {
    match query.method {
        HandleCorrectionMethod::Approve => service::approve(&repo, id, user)
            .await
            .map_err(IntoResponse::into_response)
            .map(|()| Message::ok()),
        HandleCorrectionMethod::Reject => {
            Err(api_response::Error::new("Not implemented").into_response())
        }
    }
}
