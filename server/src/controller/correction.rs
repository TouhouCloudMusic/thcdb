use axum::extract::{Path, Query, State};
use axum::middleware::from_fn;
use error_set::error_set;
use macros::EnumToResponse;
use serde::Deserialize;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

use crate::api_response::Message;
use crate::domain::model::auth::UserRoleEnum;
use crate::error::{ApiError, ServiceError};
use crate::middleware::is_signed_in;
use crate::service;
use crate::state::{ArcAppState, AuthSession};

const TAG: &str = "Correction";

pub fn router() -> OpenApiRouter<ArcAppState> {
    OpenApiRouter::new()
        .routes(routes!(handle_correction))
        .route_layer(from_fn(is_signed_in))
}

error_set! {
    #[derive(EnumToResponse)]
    Error = {
        Service(ServiceError),
        Api(ApiError)
    };
}

#[derive(ToSchema, Deserialize)]
pub enum HandleCorrectionMethod {
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
		ServiceError
	),
)]
// TODO: Better name
async fn handle_correction(
    session: AuthSession,
    Path(id): Path<i32>,
    Query(query): Query<HandleCorrectionQuery>,
    State(service): State<service::correction::Service>,
    State(user_service): State<service::user::Service>,
) -> Result<Message, Error> {
    let user = session.user.unwrap();

    if user_service
        .get_roles(user.id)
        .await?
        .into_iter()
        .any(|x| UserRoleEnum::Admin == x || UserRoleEnum::Moderator == x)
    {
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
