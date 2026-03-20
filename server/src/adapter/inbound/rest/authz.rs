use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use sea_orm::ConnectionTrait;

use crate::domain::model::PermissionMarker;
use crate::infra::authz;
use crate::shared::http::api_response;

pub async fn ensure_permission<P: PermissionMarker>(
    db: &impl ConnectionTrait,
    user_id: i32,
) -> Result<(), Response> {
    let has_permission = authz::user_has_permission::<P>(db, user_id)
        .await
        .map_err(|err| {
            log::error!(
                target: "adapter.rest.authz",
                user_id = user_id,
                error:? = err;
                "failed to check permission"
            );
            api_response::Error::from_err_and_code(
                "Database Error",
                StatusCode::INTERNAL_SERVER_ERROR,
            )
            .into_response()
        })?;

    if !has_permission {
        return Err(api_response::Error::from_err_and_code(
            "Permission denied",
            StatusCode::FORBIDDEN,
        )
        .into_response());
    }

    Ok(())
}
