use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use crate::error;
use crate::service::user::AuthSession;

pub async fn is_signed_in(
    auth_session: AuthSession,
    req: Request,
    next: Next,
) -> Result<Response, error::ApiError> {
    if auth_session.user.is_some() {
        Ok(next.run(req).await)
    } else {
        Err(error::ApiError::Unauthorized)
    }
}
