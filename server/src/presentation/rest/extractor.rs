use std::convert::Infallible;

use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;
use axum::response::IntoResponse;

use super::state;
use crate::domain::user::User;

#[trait_variant::make(Send)]
pub trait TryFromRef<T> {
    type Rejection: IntoResponse;

    async fn try_from_ref(input: &T) -> Result<Self, Self::Rejection>
    where
        Self: Sized;
}

impl<T> TryFromRef<T> for T
where
    T: Clone + Send + Sync,
{
    type Rejection = Infallible;

    async fn try_from_ref(input: &T) -> Result<Self, Self::Rejection> {
        Ok(input.clone())
    }
}

pub struct TryState<S>(pub S);

impl<In, Out> FromRequestParts<In> for TryState<Out>
where
    Out: TryFromRef<In>,
    In: Send + Sync,
{
    type Rejection = <Out as TryFromRef<In>>::Rejection;

    async fn from_request_parts(
        _parts: &mut Parts,
        state: &In,
    ) -> Result<Self, Self::Rejection> {
        let inner_state = Out::try_from_ref(state).await?;
        Ok(Self(inner_state))
    }
}

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
