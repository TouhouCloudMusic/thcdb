use auth_core::permission::Permission;
use axum::extract::{Path, Query, State};
use axum::response::IntoResponse;
use serde::Deserialize;
use utoipa::IntoParams;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::adapter::inbound::rest::state::ArcAppState;
use crate::adapter::inbound::rest::{AppRouter, CurrentUser, authz};
use crate::features::correction::model::CorrectionDecision;
use crate::features::correction::{ModerationError, service};
use crate::shared::http::api_response::Message;

#[derive(
    Debug, derive_more::Display, derive_more::Error, derive_more::From,
)]
enum Error {
    #[display("{_0}")]
    #[from]
    Authz(#[error(source)] authz::Error),
    #[display("{_0}")]
    #[from]
    Moderation(#[error(source)] ModerationError),
}

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        match self {
            Error::Authz(source) => source.into_response(),
            Error::Moderation(source) => source.into_response(),
        }
    }
}

#[derive(IntoParams, Deserialize)]
struct CorrectionModerationQuery {
    decision: CorrectionDecision,
}

pub fn router() -> OpenApiRouter<ArcAppState> {
    AppRouter::new()
        .with_private(|r| r.routes(routes!(moderate_correction)))
        .finish()
}

#[utoipa::path(
    post,
    tag = "Correction",
    path = "/correction/{id}",
    params(
        CorrectionModerationQuery
    ),
    responses(
        (status = 200, body = Message),
    ),
)]
async fn moderate_correction(
    CurrentUser(user): CurrentUser,
    Path(id): Path<i32>,
    Query(query): Query<CorrectionModerationQuery>,
    State(app_state): State<ArcAppState>,
) -> Result<Message, Error> {
    authz::ensure_permission(
        &app_state.sea_orm_repo.conn,
        user.id,
        Permission::CorrectionManage,
    )
    .await?;

    match query.decision {
        CorrectionDecision::Approve => {
            service::approve(
                &app_state.sea_orm_repo,
                app_state.user_events.clone(),
                id,
                user,
            )
            .await?;
        }
        CorrectionDecision::Reject => {
            service::reject(
                &app_state.sea_orm_repo,
                app_state.user_events.clone(),
                id,
                user,
            )
            .await?;
        }
    }

    Ok(Message::ok())
}
