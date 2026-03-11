use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::{self, ArcAppState};
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz};
use crate::domain::model::CorrectionManage;
use crate::features::correction::model::HandleCorrectionMethod;
use crate::features::correction::service;
use crate::shared::http::api_response::Message;

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
    State(notification): State<state::NotificationService>,
) -> Result<Message, axum::response::Response> {
    authz::ensure_permission::<CorrectionManage>(&repo.conn, user.id).await?;

    match query.method {
        HandleCorrectionMethod::Approve => {
            service::approve(&repo, id, user)
                .await
                .map_err(IntoResponse::into_response)?;

            notification
                .notify_correction_status_best_effort(
                    id,
                    crate::domain::model::NotificationKindEnum::CorrectionApproved,
                    Some("Your correction was approved".to_owned()),
                )
                .await;

            Ok(Message::ok())
        }
        HandleCorrectionMethod::Reject => {
            service::reject(&repo, id, user)
                .await
                .map_err(IntoResponse::into_response)?;

            notification
                .notify_correction_status_best_effort(
                    id,
                    crate::domain::model::NotificationKindEnum::CorrectionRejected,
                    Some("Your correction was rejected".to_owned()),
                )
                .await;

            Ok(Message::ok())
        }
    }
}
