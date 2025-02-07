use axum::debug_handler;
use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use error_set::error_set;
use macros::EnumToResponse;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Message;
use crate::error::{ApiError, RepositoryError};
use crate::middleware::is_signed_in;
use crate::service;
use crate::service::user::AuthSession;
use crate::state::AppState;

const TAG: &str = "Correction";

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::new()
        .routes(routes!(handle))
        .route_layer(from_fn(is_signed_in))
}

error_set! {
    #[derive(EnumToResponse)]
    Error = {
        User(service::user::Error),
        Correction(RepositoryError),
        Api(ApiError)
    };
}

#[derive(ToSchema, Deserialize)]
enum HandleCorrectionMethod {
    Approve,
    Reject,
}

#[derive(IntoParams, Deserialize)]
struct HandleCorrectionQuery {
    method: HandleCorrectionMethod,
}

#[utoipa::path(
	post,
    tag = TAG,
	path = "/correction/{id}",
    params(
        HandleCorrectionQuery
    ),
	responses(
		(status = 200, body = Message),
		(status = 401),
		RepositoryError
	),
)]
#[debug_handler(state = AppState)]
async fn handle(
    session: AuthSession,
    Path(id): Path<i32>,
    Query(query): Query<HandleCorrectionQuery>,
    State(service): State<service::correction::Service>,
    State(user_service): State<service::user::Service>,
) -> Result<Message, Error> {
    let user = session.user.unwrap();

    if user_service.have_role(user.id, "Admin").await? {
        match query.method {
            HandleCorrectionMethod::Approve => {
                service.approve(id, user.id).await?;
            }
            HandleCorrectionMethod::Reject => {
                todo!()
            }
        }
    } else {
        Err(ApiError::Unauthorized)?;
    }

    Ok(Message::ok())
}
