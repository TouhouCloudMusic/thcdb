use axum::Router;
use axum::http::{HeaderName, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;

use crate::adapter::inbound::rest::state::{ArcAppState, AuthSession};
use crate::features::auth::UserRoleEnum;

const WEBAUTH_USER: HeaderName = HeaderName::from_static("x-webauth-user");

pub(crate) fn auth_router() -> Router<ArcAppState> {
    Router::new().route("/admin/observability/auth", get(observability_auth))
}

async fn observability_auth(
    session: AuthSession,
) -> Result<Response, StatusCode> {
    let user = session
        .user
        .filter(|user| user.email_verified)
        .ok_or(StatusCode::UNAUTHORIZED)?;
    if !user
        .roles
        .iter()
        .any(|role| role.id == i32::from(UserRoleEnum::Admin))
    {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut response = StatusCode::NO_CONTENT.into_response();
    response
        .headers_mut()
        .insert(WEBAUTH_USER, HeaderValue::from_static("admin"));
    Ok(response)
}
