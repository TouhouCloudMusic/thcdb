use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::IntoResponse;

use crate::service::user::AuthSession;

pub async fn is_signed_in(
    auth_session: AuthSession,
    req: Request,
    next: Next,
) -> impl IntoResponse {
    if auth_session.user.is_some() {
        next.run(req).await
    } else {
        StatusCode::UNAUTHORIZED.into_response()
    }
}
