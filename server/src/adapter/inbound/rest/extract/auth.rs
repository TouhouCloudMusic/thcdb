use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;

use crate::adapter::inbound::rest::state;
use crate::domain::user::User;

pub struct CurrentUser(pub User);

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        let session = parts
            .extensions
            .get::<state::AuthSession>()
            .cloned()
            .ok_or_else(|| {
                tracing::error!("Failed to extract AuthSession from state");
                StatusCode::INTERNAL_SERVER_ERROR
            })?;

        session
            .user
            .map_or(Err(StatusCode::UNAUTHORIZED), |user| Ok(Self(user)))
    }
}
